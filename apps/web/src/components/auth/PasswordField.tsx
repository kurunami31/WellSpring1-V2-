import { useState, type ChangeEvent } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  autoComplete: string;
  hint?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordField({ id, name, label, value, autoComplete, hint, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = `${id}-hint`;

  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6b8299]" />
        <input
          className="text-input pl-10 pr-12"
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-describedby={hint ? hintId : undefined}
          required
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center text-[#486581]"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p id={hintId} className="mt-2 text-xs leading-5 text-[#486581]">{hint}</p>}
    </div>
  );
}
