import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          BobrChat
        </Link>
      </nav>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: January 2026
            </p>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Beta Status</h2>
              <p className="text-muted-foreground">
                BobrChat is in beta. This privacy policy and our service are
                subject to change at any time. We will notify you of material
                changes via email or through the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">What We Collect</h2>
              <p className="text-muted-foreground">
                We collect the following information:
              </p>
              <ul className="text-muted-foreground ml-4 space-y-2">
                <li>• Email addresses and names</li>
                <li>• Threads and messages</li>
                <li>• Uploaded files and images</li>
                <li>• Account information</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">How We Use Your Data</h2>
              <p className="text-muted-foreground">
                We use your data solely to operate and provide BobrChat. Your
                data is:
              </p>
              <ul className="text-muted-foreground ml-4 space-y-2">
                <li>• Never trained on or used for model training</li>
                <li>• Never sold or shared with third parties</li>
                <li>• Never used for any purpose other than service delivery</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Your Control</h2>
              <p className="text-muted-foreground">
                You have complete control over your data. You can delete:
              </p>
              <ul className="text-muted-foreground ml-4 space-y-2">
                <li>• Individual messages</li>
                <li>• Entire threads</li>
                <li>• Uploaded files</li>
                <li>• Your entire account</li>
              </ul>
              <p className="text-muted-foreground">
                Deletions are instant and permanent.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Third-Party Services</h2>
              <p className="text-muted-foreground">
                Your data is subject to the privacy policies of:
              </p>
              <ul className="text-muted-foreground ml-4 space-y-2">
                <li>• OpenRouter (your API gateway)</li>
                <li>• The specific model providers you use</li>
              </ul>
              <p className="text-muted-foreground">
                Please review their privacy policies for how they handle your
                data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Prohibited Activities</h2>
              <p className="text-muted-foreground">
                You agree not to use BobrChat for:
              </p>
              <ul className="text-muted-foreground ml-4 space-y-2">
                <li>• Illegal activities or content</li>
                <li>• Harassment, threats, or abuse</li>
                <li>• Unauthorized access to systems or accounts</li>
                <li>• Scraping, crawling, or automated data collection</li>
                <li>• Impersonation or fraud</li>
                <li>• Malware, viruses, or malicious code</li>
                <li>• Circumventing security measures</li>
                <li>• Violating intellectual property rights</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Contact</h2>
              <p className="text-muted-foreground">
                For privacy questions or concerns, contact us at:
                {" "}
                <a
                  href="mailto:bobrchat@matthew-hre.com"
                  className={`
                    text-primary
                    hover:underline
                  `}
                >
                  bobrchat@matthew-hre.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-muted-foreground px-6 py-8 text-center text-xs">
        <p>© 2026 Matthew Hrehirchuk</p>
      </footer>
    </div>
  );
}
