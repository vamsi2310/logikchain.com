import { useParams } from "react-router-dom";
import { PublicLegalScreen } from "./PublicLegalScreens";

export function PublicLegalRouteWrapper() {
  const { doc } = useParams<{ doc: string }>();
  return <PublicLegalScreen initialDoc={doc} />;
}

