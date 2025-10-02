import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Landing page - SaaS Multi-Tenant de Venda de Ingressos
 */
const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-4xl text-center">
        <h1 className="mb-6 text-5xl font-bold text-foreground">
          SaaS Multi-Tenant
        </h1>
        <h2 className="mb-4 text-3xl font-semibold text-foreground">
          Venda de Ingressos
        </h2>
        <p className="mb-8 text-xl text-muted-foreground">
          Plataforma completa para gestão e venda de ingressos para eventos
        </p>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/dashboard">Acessar Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/checkin">Portal de Check-in</Link>
          </Button>
        </div>

        <div className="mt-12 text-sm text-muted-foreground">
          <p>Etapa 0: Estrutura inicial do projeto</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
