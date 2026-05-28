export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-500 text-center py-4 text-sm mt-auto border-t border-slate-800">
      <p>
        Copyright &copy; {new Date().getFullYear()}{" "}
        <a href="https://ansessa.com" className="text-sky-400 hover:underline">
          ansessa.com
        </a>
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Never make important decisions from this website.
      </p>
    </footer>
  );
}
