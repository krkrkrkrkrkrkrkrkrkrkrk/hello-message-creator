-- Add admin role for darckisane01031@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('f1a32da3-92de-4ddc-be7a-396cdd689033', 'admin')
ON CONFLICT DO NOTHING;