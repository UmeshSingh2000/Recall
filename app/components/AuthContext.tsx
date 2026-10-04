import { clearAuthToken, hasAuthToken, saveAuthToken } from "@/lib/api";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    login: (token: string) => Promise<void>;
  };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try{
            const isAuthenticated = await hasAuthToken();
            if(!isAuthenticated){
                setLoading(false);
                return;
            }
            setIsAuthenticated(true);
        }

        catch(error){
            console.error("Auth check failed:", error);
            await clearAuthToken();
            setIsAuthenticated(false);
        }
        finally{
            setLoading(false);
        }
    }

    const logout = async () => {
        try {
            await clearAuthToken();
            setIsAuthenticated(false);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    const login = async (token: string) => {
        try {
            setLoading(true);
            await saveAuthToken(token);
            setIsAuthenticated(true);
        }
        catch(error){
            console.error("Login failed:", error);
        }
        finally{
            setLoading(false);
        }
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading: loading,
                logout,
                login,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}