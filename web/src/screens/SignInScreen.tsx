import { Brand } from "../components/Logo";

interface Props {
  onRegister: () => void;
  onUseOffline: () => void;
}

/** Sign-in draft: register, or use the app offline (AI calling still works without an account). */
export function SignInScreen({ onRegister, onUseOffline }: Props) {
  return (
    <main className="signin">
      <div className="signin-brand">
        <Brand size={80} heading />
      </div>
      {/* TODO: real registration (Firebase Auth) comes later; this just continues for now. */}
      <button className="btn btn-primary btn-block" onClick={onRegister}>
        Register!
      </button>
      <button className="btn btn-outline btn-block" onClick={onUseOffline}>
        Use it offline
      </button>
    </main>
  );
}
