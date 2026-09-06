import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-5xl items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
          Create account
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Registration</h1>

        <form className="mt-8 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Full name</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="John Doe"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Email</span>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="john@company.com"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Company</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Nexa Business"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Role requested</span>
              <select className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500">
                <option>Sales Manager</option>
                <option>Inventory Manager</option>
                <option>Accounts Manager</option>
                <option>Purchase Manager</option>
                <option>Admin</option>
                <option>Viewer</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">Password</span>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              placeholder="Create password"
            />
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Already have an account? Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Submit registration
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
