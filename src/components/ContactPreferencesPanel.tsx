import type {
  ContactExportMode,
  ContactPreferences,
  EmailKind,
  PhoneKind,
} from "../application/public";

const EMAIL_LABELS: Record<EmailKind, string> = {
  professional: "Professional",
  secondary: "Secondary",
  personal: "Personal",
  other: "Other / unspecified",
};

const PHONE_LABELS: Record<PhoneKind, string> = {
  mobile: "Mobile",
  direct: "Direct line",
  standard: "Switchboard",
  other: "Other / unspecified",
};

interface PriorityEditorProps<T extends string> {
  label: string;
  items: readonly T[];
  labels: Record<T, string>;
  onChange: (items: T[]) => void;
}

function PriorityEditor<T extends string>({
  label,
  items,
  labels,
  onChange,
}: PriorityEditorProps<T>) {
  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[destination]] = [
      reordered[destination] as T,
      reordered[index] as T,
    ];
    onChange(reordered);
  }

  return (
    <fieldset className="priority-editor">
      <legend>{label}</legend>
      <div className="priority-list">
        {items.map((item, index) => (
          <div className="priority-item" key={item}>
            <span className="priority-rank">{index + 1}</span>
            <strong>{labels[item]}</strong>
            <div className="priority-actions">
              <button
                type="button"
                aria-label={`Move ${labels[item]} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >↑</button>
              <button
                type="button"
                aria-label={`Move ${labels[item]} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >↓</button>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

interface ContactPreferencesPanelProps {
  preferences: ContactPreferences;
  onChange: (preferences: ContactPreferences) => void;
  storageDescription?: string;
}

export function ContactPreferencesPanel({
  preferences,
  onChange,
  storageDescription = "Preferences are saved on this device.",
}: ContactPreferencesPanelProps) {
  function update(patch: Partial<ContactPreferences>) {
    onChange({ ...preferences, ...patch });
  }

  return (
    <section className="panel contact-preferences-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">CONTACT PREFERENCES</p>
          <h2>Choose the best available contact details</h2>
          <p>
            DemandLint keeps every value, then selects the first valid one using these priorities.
            {storageDescription}
          </p>
        </div>
      </div>

      <div className="contact-preferences-grid">
        <PriorityEditor
          label="Email priority"
          items={preferences.emailPriority}
          labels={EMAIL_LABELS}
          onChange={(emailPriority) => update({ emailPriority })}
        />
        <PriorityEditor
          label="Phone priority"
          items={preferences.phonePriority}
          labels={PHONE_LABELS}
          onChange={(phonePriority) => update({ phonePriority })}
        />
        <div className="contact-options">
          <label>
            <span>Default phone country</span>
            <select
              value={preferences.defaultPhoneCountry}
              onChange={(event) => update({ defaultPhoneCountry: event.target.value })}
            >
              <option value="FR">France (+33)</option>
              <option value="ES">Spain (+34)</option>
              <option value="PT">Portugal (+351)</option>
              <option value="GB">United Kingdom (+44)</option>
              <option value="BE">Belgium (+32)</option>
              <option value="DE">Germany (+49)</option>
              <option value="IT">Italy (+39)</option>
              <option value="NL">Netherlands (+31)</option>
              <option value="CH">Switzerland (+41)</option>
              <option value="AT">Austria (+43)</option>
              <option value="IE">Ireland (+353)</option>
              <option value="LU">Luxembourg (+352)</option>
              <option value="US">United States (+1)</option>
              <option value="CA">Canada (+1)</option>
            </select>
          </label>
          <label>
            <span>Clean CSV contact fields</span>
            <select
              value={preferences.exportMode}
              onChange={(event) => update({
                exportMode: event.target.value as ContactExportMode,
              })}
            >
              <option value="all">Primary and all typed values</option>
              <option value="primary">Primary values only</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
