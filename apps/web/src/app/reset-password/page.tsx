import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Security</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Reset password</h1>

        <form className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">Email address</span>
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </label>

          <button
            type="button"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Send reset link
          </button>

          <div className="text-center text-sm text-slate-600">
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
