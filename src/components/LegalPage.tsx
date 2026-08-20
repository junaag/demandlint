type LegalPageKind = "terms" | "privacy";

interface LegalPageProps {
  kind: LegalPageKind;
}

export function LegalPage({ kind }: LegalPageProps) {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <header className="legal-header">
          <a className="legal-brand" href="./" aria-label="Back to DemandLint">
            <span className="auth-brand-mark" aria-hidden="true">D</span>
            <strong>DemandLint</strong>
          </a>
          <p className="legal-eyebrow">LEGAL DOCUMENT</p>
          <h1>{kind === "terms" ? "Terms and Conditions" : "Privacy Policy"}</h1>
          <p>Last updated: <time dateTime="2026-08-20">August 20, 2026</time></p>
        </header>

        <div className="legal-draft-notice" role="note">
          <strong>Working draft</strong>
          <span>
            The publisher’s complete legal details and the applicable governing law must be added and
            reviewed before DemandLint launches commercially.
          </span>
        </div>

        {kind === "terms" ? <TermsContent /> : <PrivacyContent />}

        <nav className="legal-navigation" aria-label="Legal documents">
          <a href={kind === "terms" ? "?page=privacy" : "?page=terms"}>
            {kind === "terms" ? "Read the Privacy Policy" : "Read the Terms and Conditions"}
          </a>
          <a href="./">Back to account creation</a>
        </nav>
      </article>
    </main>
  );
}

function TermsContent() {
  return (
    <div className="legal-content">
      <section>
        <h2>1. Purpose and acceptance</h2>
        <p>
          These Terms govern access to and use of DemandLint, a tool that prepares and checks contact
          files before they are imported into a CRM. By using the service, you agree to these Terms.
          DemandLint is currently provided as a preview and may evolve.
        </p>
      </section>

      <section>
        <h2>2. Intended users</h2>
        <p>
          DemandLint is intended for professional use. You must have the authority and permissions
          required to act for your organization and process any data you import.
        </p>
      </section>

      <section>
        <h2>3. How the service works</h2>
        <p>
          DemandLint reads CSV and XLSX files, helps map source columns to CRM fields, checks data
          quality, normalizes selected fields, identifies duplicates and generates export files. In the
          current version, these operations run locally in your browser. Contact files are not uploaded
          to a DemandLint server.
        </p>
      </section>

      <section>
        <h2>4. Account and workspace</h2>
        <p>
          DemandLint uses passwordless email authentication. Your account, organizations, memberships,
          preferences and mapping templates may be synchronized through the hosted account service.
          You are responsible for maintaining access to your work email and for activities performed
          through your authenticated session.
        </p>
      </section>

      <section>
        <h2>5. Your responsibilities</h2>
        <ul>
          <li>only use data that was lawfully obtained and may lawfully be processed;</li>
          <li>comply with the GDPR, marketing rules and all other applicable regulations;</li>
          <li>review all results before importing them into a CRM or contacting anyone;</li>
          <li>retain any necessary backups of source and export files; and</li>
          <li>not compromise, misuse, reverse engineer or disrupt the service.</li>
        </ul>
      </section>

      <section>
        <h2>6. Intellectual property</h2>
        <p>
          DemandLint, its interface, code, brand and content remain the property of their respective
          owner. You retain your rights in the data and files you use. Access to the service does not
          transfer any intellectual property rights.
        </p>
      </section>

      <section>
        <h2>7. Availability and changes</h2>
        <p>
          The preview service is provided as is. Features may be added, changed, suspended or removed for
          security, compliance or product-improvement reasons. Continuous availability is not guaranteed
          at this stage.
        </p>
      </section>

      <section>
        <h2>8. Results and limitations</h2>
        <p>
          DemandLint’s checks support your review but do not guarantee that data is fully accurate,
          legally compliant or compatible with every CRM configuration. You remain responsible for final
          validation and for your use of every export. Final liability provisions must be adapted to the
          publisher’s legal status and the applicable law.
        </p>
      </section>

      <section>
        <h2>9. Suspension and termination</h2>
        <p>
          You may stop using DemandLint and request account deletion from workspace settings. Browser
          site data can also be deleted through your browser settings. Access may be suspended in the
          event of unlawful, fraudulent or abusive use, or use that could harm the service or a third
          party.
        </p>
      </section>

      <section>
        <h2>10. Publisher, contact and governing law</h2>
        <p className="legal-placeholder">
          To be completed before launch: publisher name or legal entity, legal form, share capital,
          registration details, registered address, contact email, publication representative,
          governing law and competent courts.
        </p>
      </section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="legal-content">
      <section>
        <h2>1. Data controller</h2>
        <p>
          The entity operating DemandLint is the controller for the processing described in this Policy.
          Its full legal details and dedicated privacy contact address must be added before commercial
          launch.
        </p>
      </section>

      <section>
        <h2>2. Data saved by DemandLint</h2>
        <p>The hosted account service may save the following information:</p>
        <ul>
          <li>your work email and the profile name derived from it;</li>
          <li>your organizations, invitations, members, roles and active organization;</li>
          <li>your phone and email priority preferences; and</li>
          <li>your column-mapping templates.</li>
        </ul>
        <p>
          DemandLint does not request or store a password. Your browser also stores the technical
          session information required to keep you signed in.
        </p>
      </section>

      <section>
        <h2>3. Contact files</h2>
        <p>
          CSV and XLSX files, their contents and generated exports are processed locally in your
          browser. They are not uploaded to a DemandLint backend in this version. Closing the page or
          deleting site data ends the related local access, except for files you downloaded or retained
          yourself.
        </p>
      </section>

      <section>
        <h2>4. Purposes and legal bases</h2>
        <p>
          Profile and configuration data are used to provide the requested workspace, remember your
          preferences, authenticate your access, support organization collaboration and secure the
          service. The precise legal basis for each processing activity must be confirmed once the
          publisher, commercial model and final contractual journey are defined.
        </p>
      </section>

      <section>
        <h2>5. Hosting and technical data</h2>
        <p>
          The site is hosted on GitHub Pages. Account authentication and workspace configuration are
          hosted using Supabase. These providers may process technical data required to deliver and
          secure their services, including IP address, browser, device, authentication events and
          request logs, under their own documentation and contractual terms.
        </p>
      </section>

      <section>
        <h2>6. Recipients and international transfers</h2>
        <p>
          DemandLint does not sell your data. GitHub and Supabase act as technical service providers for
          site delivery and the account control plane. Contact files are not shared with those providers
          by DemandLint’s import workflow. The final processor list, hosting regions and safeguards for
          any international transfers must be completed before commercial launch.
        </p>
      </section>

      <section>
        <h2>7. Cookies and local storage</h2>
        <p>
          DemandLint currently uses no advertising cookies or audience-analytics tool. Browser storage
          retains the authenticated session and may retain local fallback configuration used during
          development. You can clear browser data, but doing so does not by itself delete synchronized
          account information from the hosted service.
        </p>
      </section>

      <section>
        <h2>8. Retention</h2>
        <p>
          Account and workspace configuration remains available while the account is active and is
          removed or anonymized according to the final retention policy after deletion. Authentication
          and hosting providers determine the retention periods that apply to their security logs and
          backups. Lead-file contents remain transient in the browser unless you save an export yourself.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          DemandLint uses one-time email codes, persisted authenticated sessions and organization-level
          access rules for hosted configuration. Local processing limits transfers of contact files, but
          security also depends on your email account, device, browser and practices. Review every file
          before using it in a CRM.
        </p>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <p>
          Depending on the GDPR and applicable law, you may have rights of access, correction, deletion,
          restriction, objection and portability. Workspace settings provide an account-deletion action;
          browser-only data can be cleared through your browser settings. A privacy-rights contact
          address must be published before launch. You may also lodge a complaint with the French CNIL
          or another competent data protection authority.
        </p>
      </section>

      <section>
        <h2>11. Changes to this Policy</h2>
        <p>
          This Policy will be updated when DemandLint’s architecture, providers, purposes or obligations
          change. The date at the top of this page identifies the current version.
        </p>
      </section>

      <section>
        <h2>12. Details to be completed</h2>
        <p className="legal-placeholder">
          To be completed before launch: identity and address of the data controller, privacy contact
          email, any data protection officer, final list of processors and mechanisms for transfers
          outside the European Economic Area.
        </p>
      </section>
    </div>
  );
}
