type LegalPageKind = "terms" | "privacy";

interface LegalPageProps {
  kind: LegalPageKind;
}

export function LegalPage({ kind }: LegalPageProps) {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <header className="legal-header">
          <a className="legal-brand" href="#signup" aria-label="Retour à DemandLint">
            <span className="auth-brand-mark" aria-hidden="true">D</span>
            <strong>DemandLint</strong>
          </a>
          <p className="legal-eyebrow">DOCUMENT JURIDIQUE</p>
          <h1>{kind === "terms" ? "Conditions d’utilisation" : "Politique de confidentialité"}</h1>
          <p>Dernière mise à jour : <time dateTime="2026-08-20">20 août 2026</time></p>
        </header>

        <div className="legal-draft-notice" role="note">
          <strong>Version de travail</strong>
          <span>
            Les coordonnées complètes de l’éditeur et le droit applicable doivent être renseignés et
            validés avant le lancement commercial de DemandLint.
          </span>
        </div>

        {kind === "terms" ? <TermsContent /> : <PrivacyContent />}

        <nav className="legal-navigation" aria-label="Documents juridiques">
          <a href={kind === "terms" ? "#privacy" : "#terms"}>
            {kind === "terms" ? "Consulter la politique de confidentialité" : "Consulter les conditions d’utilisation"}
          </a>
          <a href="#signup">Retour à la création de compte</a>
        </nav>
      </article>
    </main>
  );
}

function TermsContent() {
  return (
    <div className="legal-content">
      <section>
        <h2>1. Objet et acceptation</h2>
        <p>
          Les présentes conditions encadrent l’accès et l’utilisation de DemandLint, un outil de
          préparation et de contrôle qualité de fichiers de contacts avant import dans un CRM. En
          utilisant le service, vous acceptez ces conditions. DemandLint est actuellement proposé en
          version de prévisualisation et peut évoluer.
        </p>
      </section>

      <section>
        <h2>2. Public concerné</h2>
        <p>
          DemandLint est destiné à un usage professionnel. Vous devez disposer de la capacité et des
          autorisations nécessaires pour agir au nom de votre organisation et traiter les données que
          vous importez.
        </p>
      </section>

      <section>
        <h2>3. Fonctionnement du service</h2>
        <p>
          DemandLint lit des fichiers CSV ou XLSX, aide à associer leurs colonnes à des champs CRM,
          contrôle la qualité des données, normalise certains champs, détecte les doublons et produit
          des fichiers d’export. Dans la version actuelle, ces opérations sont réalisées localement dans
          votre navigateur : les fichiers de contacts ne sont pas envoyés à un serveur DemandLint.
        </p>
      </section>

      <section>
        <h2>4. Compte de prévisualisation</h2>
        <p>
          Le compte, les organisations, les préférences et les modèles de mapping sont enregistrés dans
          le stockage local du navigateur. Aucun mot de passe n’est collecté. Ce mécanisme n’est pas une
          authentification de production et ne permet ni synchronisation entre appareils ni récupération
          automatique après suppression des données du navigateur.
        </p>
      </section>

      <section>
        <h2>5. Vos responsabilités</h2>
        <ul>
          <li>utiliser uniquement des données obtenues et traitées légalement ;</li>
          <li>respecter le RGPD, les règles de prospection et toute réglementation applicable ;</li>
          <li>vérifier les résultats avant tout import dans un CRM ou toute prise de contact ;</li>
          <li>conserver une copie de sauvegarde des fichiers sources et exports utiles ;</li>
          <li>ne pas chercher à compromettre, détourner ou perturber le service.</li>
        </ul>
      </section>

      <section>
        <h2>6. Propriété intellectuelle</h2>
        <p>
          DemandLint, son interface, son code, sa marque et ses contenus restent la propriété de leur
          titulaire. Vous conservez vos droits sur les données et fichiers que vous utilisez. L’accès au
          service ne transfère aucun droit de propriété intellectuelle.
        </p>
      </section>

      <section>
        <h2>7. Disponibilité et évolution</h2>
        <p>
          Le service de prévisualisation est fourni en l’état. Des fonctionnalités peuvent être ajoutées,
          modifiées, suspendues ou supprimées, notamment pour des raisons de sécurité, de conformité ou
          d’amélioration du produit. Aucune disponibilité continue n’est garantie à ce stade.
        </p>
      </section>

      <section>
        <h2>8. Résultats et limitation</h2>
        <p>
          Les contrôles DemandLint assistent votre revue mais ne garantissent ni l’exactitude complète des
          données, ni leur conformité juridique, ni leur compatibilité avec chaque configuration CRM. Vous
          restez responsable de la validation finale et de l’usage des exports. Les limitations de
          responsabilité définitives devront être adaptées au statut de l’éditeur et au droit applicable.
        </p>
      </section>

      <section>
        <h2>9. Suspension et fin d’utilisation</h2>
        <p>
          Vous pouvez cesser d’utiliser DemandLint à tout moment et supprimer les données locales du site
          depuis les réglages de votre navigateur. L’accès peut être suspendu en cas d’usage illicite,
          frauduleux, abusif ou susceptible de nuire au service ou à des tiers.
        </p>
      </section>

      <section>
        <h2>10. Éditeur, contact et droit applicable</h2>
        <p className="legal-placeholder">
          À compléter avant lancement : raison sociale ou identité de l’éditeur, forme juridique, capital,
          immatriculation, adresse du siège, e-mail de contact, représentant de la publication, droit
          applicable et juridiction compétente.
        </p>
      </section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="legal-content">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          L’entité qui exploite DemandLint est responsable des traitements décrits dans cette politique.
          Ses coordonnées légales et son adresse de contact dédiée à la protection des données doivent
          être renseignées avant le lancement commercial.
        </p>
      </section>

      <section>
        <h2>2. Données enregistrées par DemandLint</h2>
        <p>Dans la version actuelle, le navigateur peut enregistrer localement :</p>
        <ul>
          <li>votre e-mail professionnel et le nom de profil qui en est dérivé ;</li>
          <li>vos organisations, membres, rôles et organisation active ;</li>
          <li>vos préférences de priorité pour les téléphones et e-mails ;</li>
          <li>vos modèles de correspondance de colonnes.</li>
        </ul>
        <p>Aucun mot de passe n’est demandé ou stocké par DemandLint.</p>
      </section>

      <section>
        <h2>3. Fichiers de contacts</h2>
        <p>
          Les fichiers CSV et XLSX, leur contenu et les exports générés sont traités localement dans votre
          navigateur. Ils ne sont pas téléversés vers un backend DemandLint dans cette version. Fermer la
          page ou supprimer les données du site met fin à l’accès local concerné, sous réserve des fichiers
          que vous avez vous-même téléchargés ou conservés.
        </p>
      </section>

      <section>
        <h2>4. Finalités et bases juridiques</h2>
        <p>
          Les données de profil et de configuration servent à fournir l’espace de travail demandé, à
          mémoriser vos préférences et à sécuriser le fonctionnement de la prévisualisation. La base
          juridique précise de chaque traitement devra être confirmée selon l’identité de l’éditeur, le
          modèle commercial retenu et le parcours contractuel final.
        </p>
      </section>

      <section>
        <h2>5. Hébergement et données techniques</h2>
        <p>
          Le site est actuellement publié avec GitHub Pages. Comme tout hébergeur web, GitHub peut traiter
          des données techniques nécessaires à la fourniture et à la sécurité du service, telles que
          l’adresse IP, le navigateur, l’appareil et les journaux de requêtes, selon sa propre documentation
          et sa politique de confidentialité.
        </p>
      </section>

      <section>
        <h2>6. Destinataires et transferts</h2>
        <p>
          DemandLint ne vend pas vos données. Dans la version actuelle, aucun fichier de contacts n’est
          transmis à un fournisseur DemandLint. Les éventuels traitements techniques opérés par GitHub
          relèvent de son infrastructure. Toute future authentification, synchronisation cloud ou mesure
          d’audience devra être ajoutée à cette politique avant son activation.
        </p>
      </section>

      <section>
        <h2>7. Cookies et stockage local</h2>
        <p>
          DemandLint n’utilise actuellement ni cookie publicitaire ni outil d’analyse d’audience. Le
          stockage local du navigateur est utilisé pour conserver le profil de test et les préférences de
          l’espace de travail. Vous pouvez le supprimer depuis les paramètres de confidentialité de votre
          navigateur.
        </p>
      </section>

      <section>
        <h2>8. Durée de conservation</h2>
        <p>
          Les données locales restent sur l’appareil jusqu’à leur suppression par l’utilisateur, la
          réinitialisation du navigateur ou une évolution du service. Les durées applicables aux éventuels
          journaux techniques de GitHub sont déterminées par GitHub.
        </p>
      </section>

      <section>
        <h2>9. Sécurité</h2>
        <p>
          Le traitement local limite le transfert des fichiers de contacts, mais la sécurité dépend aussi
          de votre appareil, de votre navigateur et de vos pratiques. N’utilisez pas la prévisualisation sur
          un appareil partagé pour des données sensibles et vérifiez les fichiers avant tout usage CRM.
        </p>
      </section>

      <section>
        <h2>10. Vos droits</h2>
        <p>
          Selon le RGPD et la législation applicable, vous pouvez disposer de droits d’accès, de
          rectification, d’effacement, de limitation, d’opposition et de portabilité. Pour les données
          uniquement stockées dans votre navigateur, vous pouvez agir directement en supprimant les données
          du site. Une adresse d’exercice des droits doit être publiée avant lancement. Vous pouvez également
          introduire une réclamation auprès de la CNIL ou de l’autorité de contrôle compétente.
        </p>
      </section>

      <section>
        <h2>11. Évolution de cette politique</h2>
        <p>
          Cette politique sera mise à jour lorsque l’architecture, les fournisseurs, les finalités ou les
          obligations de DemandLint évolueront. La date de mise à jour affichée en haut de page permet
          d’identifier la version applicable.
        </p>
      </section>

      <section>
        <h2>12. Coordonnées à compléter</h2>
        <p className="legal-placeholder">
          À compléter avant lancement : identité et adresse du responsable de traitement, e-mail de contact
          confidentialité, éventuel délégué à la protection des données, liste finale des sous-traitants et
          mécanismes de transfert hors Espace économique européen.
        </p>
      </section>
    </div>
  );
}
