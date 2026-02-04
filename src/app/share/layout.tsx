import "katex/dist/katex.min.css";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="w-full">{children}</main>;
}
