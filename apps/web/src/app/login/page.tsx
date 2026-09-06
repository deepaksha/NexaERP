import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6 py-16">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg md:grid-cols-2">
        <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-blue-300">
              NexaERP
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">
              Manage your operations from one place.
            </h1>
          </div>

          <div className="space-y-4 text-sm text-slate-300">
            <p>• Inventory tracking</p>
            <p>• Sales and billing</p>
            <p>• Supplier and customer management</p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Sign in</h2>
          </div>

          <form className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Email</span>
              <input
                type="email"
                defaultValue="admin@nexaerp.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Password</span>
              <input
                type="password"
                defaultValue="password123"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Remember me
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Forgot password?
              </a>
            </div>

            <Link
              href="/dashboard"
              className="block rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Sign in
            </Link>

            <p className="text-center text-sm text-slate-500">
              Need an account?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
