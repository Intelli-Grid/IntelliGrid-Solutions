import * as React from "react"
import * as ToastPrimitive from "@radix-ui/react-toast"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useToast } from "../../context/ToastContext"

export default function Toaster() {
    const { toasts, removeToast } = useToast()

    return (
        <ToastPrimitive.Provider swipeDirection="right">
            {toasts.map(function ({ id, title, description, variant, duration }) {
                return (
                    <ToastPrimitive.Root
                        key={id}
                        duration={duration}
                        onOpenChange={(open) => !open && removeToast(id)}
                        className={`
                group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all 
                data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full mt-2
                ${variant === "destructive" ? "border-red-500/50 bg-red-900/90 text-white" : ""}
                ${variant === "success" ? "border-green-500/50 bg-green-900/90 text-white" : ""}
                ${variant === "default" ? "border-white/10 bg-gray-900/90 text-white backdrop-blur-md" : ""}
            `}
                    >
                        <div className="flex gap-3 items-start">
                            {variant === "success" && <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />}
                            {variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />}
                            {variant === "default" && <Info className="h-5 w-5 text-blue-400 mt-0.5" />}

                            <div className="grid gap-1">
                                {title && <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>}
                                {description && (
                                    <ToastPrimitive.Description className="text-sm opacity-90">
                                        {description}
                                    </ToastPrimitive.Description>
                                )}
                            </div>
                        </div>

                        <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-white/50 opacity-0 transition-opacity hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
                            <X className="h-4 w-4" />
                        </ToastPrimitive.Close>
                    </ToastPrimitive.Root>
                )
            })}
            <ToastPrimitive.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
        </ToastPrimitive.Provider>
    )
}
