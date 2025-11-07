"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Fragment } from "react";
import { Transition } from "@headlessui/react";

type SuccessContext = {
  showSuccess: (message: string) => void;
};

const SuccessCtx = createContext<SuccessContext>({
  showSuccess: () => {},
});

export function useSuccess() {
  return useContext(SuccessCtx);
}

export function SuccessProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  const showSuccess = (msg: string) => {
    setMessage(msg);
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), 3000);
  };

  return (
    <SuccessCtx.Provider value={{ showSuccess }}>
      {children}
      <Transition show={isVisible} as={Fragment}>
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-center pt-8">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-[-20px] scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-[-10px] scale-95"
          >
            <div className="modal-panel p-4 border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600">
                  <span className="text-white text-xl">✓</span>
                </div>
                <p className="text-white font-medium">{message}</p>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </SuccessCtx.Provider>
  );
}

