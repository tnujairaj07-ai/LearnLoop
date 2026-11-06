import { motion } from "framer-motion";
import Sidebar from "./Sidebar";

export default function PageShell({ children, title, subtitle, headerAction }) {
  return (
    <div className="min-h-screen w-full bg-[#f8fafd] flex flex-col md:flex-row">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex-1 min-w-0 bg-[#f8fafd] overflow-y-auto"
      >
        {title ? (
          <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
              {headerAction && <div>{headerAction}</div>}
            </header>
            {children}
          </div>
        ) : (
          children
        )}
      </motion.main>
    </div>
  );
}
