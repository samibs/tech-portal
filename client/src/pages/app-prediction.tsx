import { useParams } from "wouter";
import FailurePredictionCard from "@/components/failure-prediction-card";

export default function AppPredictionPage() {
  const { appId } = useParams();
  const id = appId ? parseInt(appId) : undefined;
  
  if (!id) {
    return <div>Invalid app ID</div>;
  }
  
  return (
    <div className="container mx-auto py-6">
      <FailurePredictionCard appId={id} />
    </div>
  );
}