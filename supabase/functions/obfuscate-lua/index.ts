import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// ShadowAuth Obfuscator - Luraph API Integration + Local Engine
// Supports: LPH_NO_VIRTUALIZE, LPH_JIT, LPH_JIT_MAX macros
// Performance optimizations from Luraph documentation
// ============================================================================

const LURAPH_API_URL = "https://api.lura.ph/v1";

// Base64 encode/decode
const base64Charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const moreCharset = base64Charset + '!@#$%&*()-=[];\'",./+{}:|<>?';

function base64Encode(str: string): string {
  // Use Deno's built-in btoa for binary safety
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function genPass(len: number): string {
  let result = '';
  for (let i = 0; i < len; i++) {
    result += moreCharset[Math.floor(Math.random() * moreCharset.length)];
  }
  return result;
}

// ============================================================================
// LURAPH API CLIENT
// Full integration with Luraph obfuscation service
// ============================================================================

interface LuraphNode {
  version: string;
  cpuUsage: number;
  options: Record<string, {
    name: string;
    description: string;
    tier: string;
    type: string;
    required: boolean;
    choices: string[];
    dependencies: Record<string, unknown[]>;
  }>;
}

interface LuraphNodesResponse {
  recommendedId: string;
  nodes: Record<string, LuraphNode>;
}

interface LuraphOptions {
  // Core Luraph options
  TARGET_VERSION?: string;
  DISABLE_LINE_INFORMATION?: boolean;
  ENABLE_GC_FIXES?: boolean;
  CONSTANT_ENCRYPTION?: boolean;
  CONTROL_FLOW?: boolean;
  ANTI_TAMPER?: boolean;
  VM_ENCRYPTION?: boolean;
  STRING_ENCRYPTION?: boolean;
  VARIABLE_RENAME?: boolean;
  JUNK_CODE?: boolean;
  // Custom options will be passed through
  [key: string]: unknown;
}

class LuraphClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = LURAPH_API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set('Luraph-API-Key', this.apiKey);
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
      ...options,
      headers,
    });
  }

  async getNodes(): Promise<LuraphNodesResponse> {
    const response = await this.request('/obfuscate/nodes');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Luraph API error: ${JSON.stringify(error)}`);
    }
    return response.json();
  }

  async submitJob(
    script: string,
    fileName: string,
    nodeId: string,
    options: LuraphOptions
  ): Promise<string> {
    const response = await this.request('/obfuscate/new', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        node: nodeId,
        script: base64Encode(script),
        options,
        enforceSettings: false, // Allow partial options
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Luraph submit error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.jobId;
  }

  async waitForJob(jobId: string, timeout: number = 120000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = await this.request(`/obfuscate/status/${jobId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        // Timeout on status endpoint, retry
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Luraph compilation error: ${data.error}`);
      }
      
      // Empty response means job is complete
      return;
    }

    throw new Error('Luraph job timeout');
  }

  async downloadResult(jobId: string): Promise<string> {
    const response = await this.request(`/obfuscate/download/${jobId}`);
    
    if (!response.ok) {
      if (response.status === 410) {
        throw new Error('Obfuscation result expired');
      }
      const error = await response.json();
      throw new Error(`Luraph download error: ${JSON.stringify(error)}`);
    }

    return response.text();
  }

  async obfuscate(
    script: string,
    fileName: string = 'script.lua',
    options: LuraphOptions = {}
  ): Promise<string> {
    // Get available nodes
    const nodes = await this.getNodes();
    const nodeId = nodes.recommendedId;

    if (!nodeId) {
      throw new Error('No Luraph nodes available');
    }

    console.log(`Using Luraph node: ${nodeId} (v${nodes.nodes[nodeId].version})`);

    // Submit job
    const jobId = await this.submitJob(script, fileName, nodeId, options);
    console.log(`Luraph job submitted: ${jobId}`);

    // Wait for completion
    await this.waitForJob(jobId);
    console.log('Luraph job completed');

    // Download result
    const result = await this.downloadResult(jobId);
    return result;
  }
}

// ============================================================================
// MACRO PROCESSOR
// Handles LPH_NO_VIRTUALIZE, LPH_JIT, LPH_JIT_MAX macros
// ============================================================================

interface MacroRegion {
  type: 'NO_VIRTUALIZE' | 'JIT' | 'JIT_MAX' | 'NO_UPVALUES' | 'CRASH' | 'ENCSTR' | 'ENCNUM';
  start: number;
  end: number;
  content: string;
}

function extractMacros(code: string): { cleanCode: string; macros: MacroRegion[] } {
  const macros: MacroRegion[] = [];
  let cleanCode = code;

  // LPH_NO_VIRTUALIZE(function() ... end) - wraps functions to skip virtualization
  const noVirtRegex = /LPH_NO_VIRTUALIZE\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  let match;
  
  while ((match = noVirtRegex.exec(code)) !== null) {
    macros.push({
      type: 'NO_VIRTUALIZE',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_JIT(function() ... end) - JIT optimized regions
  const jitRegex = /LPH_JIT\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  while ((match = jitRegex.exec(code)) !== null) {
    macros.push({
      type: 'JIT',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_JIT_MAX(function() ... end) - Maximum JIT optimization
  const jitMaxRegex = /LPH_JIT_MAX\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  while ((match = jitMaxRegex.exec(code)) !== null) {
    macros.push({
      type: 'JIT_MAX',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_NO_UPVALUES(function() ... end) - Removes upvalues
  const noUpvRegex = /LPH_NO_UPVALUES\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  while ((match = noUpvRegex.exec(code)) !== null) {
    macros.push({
      type: 'NO_UPVALUES',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_CRASH() - Intentional crash point
  cleanCode = cleanCode.replace(/LPH_CRASH\s*\(\s*\)/g, 'while true do end');

  // LPH_ENCSTR("string") - Encrypted string literal
  const encStrRegex = /LPH_ENCSTR\s*\(\s*"([^"]*)"\s*\)/g;
  cleanCode = cleanCode.replace(encStrRegex, (_, str) => {
    // Keep as-is for now, will be encrypted by obfuscator
    return `"${str}"`;
  });

  // LPH_ENCNUM(number) - Encrypted number literal
  const encNumRegex = /LPH_ENCNUM\s*\(\s*(\d+)\s*\)/g;
  cleanCode = cleanCode.replace(encNumRegex, (_, num) => num);

  return { cleanCode, macros };
}

// ============================================================================
// LOCAL OBFUSCATION ENGINE (fallback when Luraph unavailable)
// Based on bitef4/Luau_Discord_Bot_Obfuscator
// ============================================================================

const h2b: Record<string, string> = {
  '0': '0000', '1': '0001', '2': '0010', '3': '0011',
  '4': '0100', '5': '0101', '6': '0110', '7': '0111',
  '8': '1000', '9': '1001', 'A': '1010', 'B': '1011',
  'C': '1100', 'D': '1101', 'E': '1110', 'F': '1111'
};

function d2b(n: number): string {
  const hex = n.toString(16).toUpperCase();
  return hex.split('').map(c => h2b[c] || '').join('');
}

function genIl(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const binary = d2b(charCode).padStart(8, '0');
    result += binary.replace(/0/g, 'l').replace(/1/g, 'I');
  }
  return result;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xFF);
  }
  return bytes;
}

class RC4 {
  private S: number[] = [];
  private i: number = 0;
  private j: number = 0;
  private xorTable: number[][];

  constructor(key: string) {
    this.xorTable = this.buildXorTable();
    
    for (let i = 0; i < 256; i++) {
      this.S[i] = i;
    }
    
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + this.S[i] + key.charCodeAt(i % key.length)) % 256;
      [this.S[i], this.S[j]] = [this.S[j], this.S[i]];
    }
  }

  private buildXorTable(): number[][] {
    const c: number[][] = [];
    for (let d = 0; d < 256; d++) {
      c[d] = [];
    }
    
    const b = [0, 1, 1, 0];
    c[0][0] = b[0] * 255;
    
    let e = 1;
    for (let f = 0; f < 8; f++) {
      for (let d = 0; d < e; d++) {
        for (let g = 0; g < e; g++) {
          const h = c[d][g] - b[0] * e;
          c[d][g + e] = h + b[1] * e;
          c[d + e][g] = h + b[2] * e;
          c[d + e][g + e] = h + b[3] * e;
        }
      }
      e *= 2;
    }
    
    return c;
  }

  generate(len: number): string {
    let result = '';
    for (let o = 0; o < len; o++) {
      this.i = (this.i + 1) % 256;
      this.j = (this.j + this.S[this.i]) % 256;
      [this.S[this.i], this.S[this.j]] = [this.S[this.j], this.S[this.i]];
      result += String.fromCharCode(this.S[(this.S[this.i] + this.S[this.j]) % 256]);
    }
    return result;
  }

  cipher(data: string): string {
    const keystream = this.generate(data.length);
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(this.xorTable[data.charCodeAt(i)][keystream.charCodeAt(i)]);
    }
    return result;
  }
}

function obfuscateLocal(source: string, options: Record<string, unknown> = {}): string {
  const _settings = {
    comment: '// ShadowAuth Protected',
    variablecomment: 'ShadowAuth Protection Engine v3',
    cryptvarcomment: true,
    variablename: 'SHADOW',
  };

  const opt = {
    comment: (options.comment as string) || _settings.comment,
    variablecomment: (options.variablecomment as string) || _settings.variablecomment,
    cryptvarcomment: options.cryptvarcomment !== false,
    variablename: ((options.variablename as string) || _settings.variablename)
      .replace(/[^\w]/g, '_')
      .replace(/^(\d)/, 'v$1'),
  };

  const varname = opt.variablename;
  
  const varcomment = opt.cryptvarcomment 
    ? '\\' + stringToBytes(opt.variablecomment).join('\\')
    : opt.variablecomment;

  const passkey = genPass(Math.floor(Math.random() * 11) + 10);
  const sourceB64 = base64Encode(source);
  const rc4 = new RC4(passkey);
  const encrypted = rc4.cipher(sourceB64);
  const key64 = base64Encode(passkey);

  const v_z = varname + genIl("z");
  const v_a = varname + genIl("a");
  const v_b = varname + genIl("b");
  const v_c = varname + genIl("c");
  const v_d = varname + genIl("d");
  const v_e = varname + genIl("e");
  const v_f = varname + genIl("f");
  const v_g = varname + genIl("g");
  const v_i = varname + genIl("i");
  const v_j = varname + genIl("j");
  const v_k = varname + genIl("k");
  const v_m = varname + genIl("m");
  const v_n = varname + genIl("n");
  const v_o = varname + genIl("o");
  const v_h = varname + genIl("h");

  const keyBytecode = '\\' + stringToBytes(key64).join('\\');
  const encryptedBytes = stringToBytes(encrypted);
  const encBytecode = '\\' + encryptedBytes.join('\\');

  const fake1 = Math.floor(Math.random() * 31304 + 111) / 100;
  const fake2 = Math.floor(Math.random() * 31304 + 111) / 100;
  const fake3 = Math.floor(Math.PI);
  const fakeEnc1 = base64Encode(genPass(Math.floor(Math.random() * 11) + 10));
  const fakeEnc2 = base64Encode(genPass(Math.floor(Math.random() * 11) + 10));
  const fakeEnc3 = base64Encode(genPass(Math.floor(Math.random() * 11) + 10));

  let output = '';

  output += `--${opt.comment}\n\n`;
  output += `return (function()`;
  output += `local ${v_z} = "${varcomment}";`;
  output += `local ${v_z} = "${varcomment}";`;
  output += `local ${v_z} = "${varcomment}";`;
  output += `local ${v_a}=${fake1};`;
  output += `local ${v_b}=${fake2};`;
  output += `local ${v_c}=${fake3};`;

  output += `local ${v_i}=(function()`;
  output += `local b='${base64Charset}'`;
  output += `return function(data)`;
  output += `data=string.gsub(data,'[^'..b..'=]','')`;
  output += `return(data:gsub('.',function(x)`;
  output += `if(x=='=')then return''end`;
  output += `local r,f='',(b:find(x)-1)`;
  output += `for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and'1'or'0')end`;
  output += `return r`;
  output += `end):gsub('%d%d%d?%d?%d?%d?%d?%d?',function(x)`;
  output += `if(#x~=8)then return''end`;
  output += `local c=0`;
  output += `for i=1,8 do c=c+(x:sub(i,i)=='1'and 2^(8-i)or 0)end`;
  output += `return string.char(c)`;
  output += `end))end end)();`;

  output += `local ${v_b}=${Math.floor(Math.random() * 31304 + 111) / 100};`;

  output += `local ${v_j}=(function()`;
  output += `local function buildXor(b)`;
  output += `local c={}`;
  output += `for d=0,255 do c[d]={}end`;
  output += `c[0][0]=b[1]*255`;
  output += `local e=1`;
  output += `for f=0,7 do`;
  output += `for d=0,e-1 do`;
  output += `for g=0,e-1 do`;
  output += `local h=c[d][g]-b[1]*e`;
  output += `c[d][g+e]=h+b[2]*e`;
  output += `c[d+e][g]=h+b[3]*e`;
  output += `c[d+e][g+e]=h+b[4]*e`;
  output += `end end`;
  output += `e=e*2`;
  output += `end`;
  output += `return c end`;
  output += `local xor=buildXor{0,1,1,0}`;
  output += `local function gen(self,k)`;
  output += `local S,i,j=self.S,self.i,self.j`;
  output += `local r={}`;
  output += `for o=1,k do`;
  output += `i=(i+1)%256`;
  output += `j=(j+S[i])%256`;
  output += `S[i],S[j]=S[j],S[i]`;
  output += `r[o]=string.char(S[(S[i]+S[j])%256])`;
  output += `end`;
  output += `self.i,self.j=i,j`;
  output += `return table.concat(r)end`;
  output += `local function cipher(self,data)`;
  output += `local ks=gen(self,#data)`;
  output += `local r={}`;
  output += `for i=1,#data do`;
  output += `r[i]=string.char(xor[data:byte(i)][ks:byte(i)])`;
  output += `end`;
  output += `return table.concat(r)end`;
  output += `local function schedule(self,key)`;
  output += `local S=self.S`;
  output += `local j,len=0,#key`;
  output += `for i=0,255 do`;
  output += `j=(j+S[i]+key:byte(i%len+1))%256`;
  output += `S[i],S[j]=S[j],S[i]`;
  output += `end end`;
  output += `return function(key)`;
  output += `local S={}`;
  output += `for i=0,255 do S[i]=i end`;
  output += `local self={S=S,i=0,j=0,generate=gen,cipher=cipher,schedule=schedule}`;
  output += `if key then self:schedule(key)end`;
  output += `return self end end)();`;

  output += `local fev=getfenv or function()return _ENV end;`;

  output += `local ${v_k}=function(code,env)`;
  output += `local fn,err=(loadstring or load)(code)`;
  output += `if not fn then error("Load error: "..tostring(err))end`;
  output += `if setfenv then setfenv(fn,env)end`;
  output += `return fn end;`;

  output += `local ${v_e}='${fakeEnc1}';`;
  output += `local ${v_n}="${encBytecode}";`;
  output += `local ${v_f}='${opt.variablecomment}';`;
  output += `local ${v_g}='${fakeEnc2}';`;

  output += `local ${v_m}=function(a,b)`;
  output += `local c=${v_j}(${v_i}(a))`;
  output += `local d=c["\\99\\105\\112\\104\\101\\114"](c,b)`;
  output += `return ${v_i}(d)`;
  output += `end;`;

  output += `local ${v_d}="${keyBytecode}";`;
  output += `local ${v_o}='${fakeEnc1}${fakeEnc2}${fakeEnc3}';`;
  output += `function ${v_h}(a,b)local c=${v_i}(a,b);local d=${v_e};return c,d end;`;
  output += `return ${v_k}(${v_m}(${v_d},${v_n}),fev(0))()`;
  output += `end)()`;

  return output;
}

// ============================================================================
// MAIN OBFUSCATION HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, options } = await req.json();

    if (!code || typeof code !== 'string') {
      throw new Error('No code provided');
    }

    console.log('Starting obfuscation...');
    console.log('Input length:', code.length);
    console.log('Options:', JSON.stringify(options || {}));

    // Process macros
    const { cleanCode, macros } = extractMacros(code);
    console.log(`Found ${macros.length} macro regions`);

    // Check if Luraph API should be used
    const useLuraph = options?.useLuraph === true;
    const luraphApiKey = Deno.env.get("LURAPH_API_KEY");

    let obfuscatedCode: string;
    let engine = 'local';

    if (useLuraph && luraphApiKey) {
      console.log('Using Luraph API for obfuscation...');
      
      try {
        const client = new LuraphClient(luraphApiKey);

        // Build Luraph options based on user settings
        const luraphOptions: LuraphOptions = {
          TARGET_VERSION: options?.targetVersion || 'Roblox',
          DISABLE_LINE_INFORMATION: options?.disableLineInfo !== false,
          ENABLE_GC_FIXES: options?.enableGcFixes === true,
        };

        // Add optional settings if enabled
        if (options?.constantEncryption !== false) {
          luraphOptions.CONSTANT_ENCRYPTION = true;
        }
        if (options?.controlFlow !== false) {
          luraphOptions.CONTROL_FLOW = true;
        }
        if (options?.antiTamper !== false) {
          luraphOptions.ANTI_TAMPER = true;
        }
        if (options?.vmEncryption !== false) {
          luraphOptions.VM_ENCRYPTION = true;
        }
        if (options?.stringEncryption !== false) {
          luraphOptions.STRING_ENCRYPTION = true;
        }

        obfuscatedCode = await client.obfuscate(
          cleanCode,
          'script.lua',
          luraphOptions
        );
        engine = 'luraph';
        
      } catch (luraphError) {
        console.error('Luraph API error, falling back to local engine:', luraphError);
        obfuscatedCode = obfuscateLocal(cleanCode, options);
        engine = 'local (fallback)';
      }
    } else {
      // Use local obfuscation engine
      obfuscatedCode = obfuscateLocal(cleanCode, options);
    }

    console.log(`Obfuscation complete using ${engine} engine`);
    console.log('Output length:', obfuscatedCode.length);

    return new Response(
      JSON.stringify({
        success: true,
        code: obfuscatedCode,
        engine,
        macrosProcessed: macros.length,
        stats: {
          originalSize: code.length,
          obfuscatedSize: obfuscatedCode.length,
          ratio: (obfuscatedCode.length / code.length).toFixed(2)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Obfuscation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
