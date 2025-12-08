import LoginForm from "@/components/auth/LoginForm";
import LMLIcon from "@/assets/LML-Icon.svg";

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="flex flex-col items-center space-y-3">
          <img
            src={LMLIcon}
            alt="LML Lift Consultants"
            className="h-24 w-24"
          />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">LML Work Management Portal</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Login</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
