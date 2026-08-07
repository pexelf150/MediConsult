import { Toaster as Sonner } from "sonner";
import { Check, X, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      icons={{
        success: (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white"
          >
            <Check className="h-4 w-4" />
          </motion.div>
        ),
        error: (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
          >
            <X className="h-4 w-4" />
          </motion.div>
        ),
        info: (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white"
          >
            <AlertCircle className="h-4 w-4" />
          </motion.div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
