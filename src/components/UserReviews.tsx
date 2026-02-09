import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Quote, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  user_name: string | null;
  avatar_url: string | null;
  rating: number;
  review_text: string;
  plan_purchased: string;
  created_at: string;
}

const UserReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("user_reviews")
      .select("*")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (!error && data) {
      setReviews(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-4" />
                <div className="h-16 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Testimonials</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
            What Our <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Users</span> Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from developers who trust ShadowAuth to protect their scripts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ReviewCard review={review} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ReviewCard = ({ review }: { review: Review }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass p-6 rounded-2xl h-full flex flex-col card-hover"
    >
      {/* Quote Icon */}
      <Quote className="w-8 h-8 text-primary/30 mb-4" />

      {/* Rating */}
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Review Text */}
      <p className="text-muted-foreground text-sm leading-relaxed flex-grow mb-6">
        "{review.review_text}"
      </p>

      {/* User Info */}
      <div className="flex items-center gap-3 pt-4 border-t border-border/50">
        {review.avatar_url ? (
          <img
            src={review.avatar_url}
            alt={review.user_name || "User"}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <p className="font-medium text-foreground text-sm">
            {review.user_name || "Anonymous"}
          </p>
          <p className="text-xs text-muted-foreground">
            {review.plan_purchased} • {formatDate(review.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default UserReviews;