import { Head, usePoll } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function TestAgentVerify({ result }: { result: any }) {
    // Poll the page every 1 second to update the 'result' prop
    usePoll(1000, { only: ['result'] });

    return (
        <AppLayout breadcrumbs={[{ title: 'LiveKit Agent Verification', href: '/test-agent-verify' }]}>
            <Head title="LiveKit Agent Verify" />
            
            <div className="flex h-full flex-col gap-6 p-6">
                <div className="rounded-lg border border-sidebar-border/50 p-6 bg-card text-card-foreground">
                    <h2 className="text-xl font-semibold mb-4">Python Pipeline Inference Stream</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        This page automatically polls for new frames processed by the LiveKit Python agent.
                        Start your camera in a consultation room to trigger the pipeline.
                    </p>

                    <div className="bg-neutral-950 p-4 rounded-md overflow-auto border border-neutral-800">
                        {result ? (
                            <pre className="text-sm text-green-400">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        ) : (
                            <div className="flex items-center gap-2 text-yellow-500">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                                Waiting for data from LiveKit Agent...
                            </div>
                        )}
                    </div>
                    
                    {result?.ml_results?.model_A?.bounding_boxes && (
                        <div className="mt-8 border-t border-sidebar-border/50 pt-6">
                            <h3 className="text-lg font-medium mb-3">Simulated Render</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Detected Faces: {result.ml_results.model_A.faces_detected}
                            </p>
                            <div className="relative border border-dashed border-gray-600 bg-black" style={{ width: 400, height: 300 }}>
                                <div className="absolute inset-0 flex items-center justify-center text-gray-700">Video Feed (Hidden)</div>
                                {result.ml_results.model_A.bounding_boxes.map((box: any, i: number) => (
                                    <div 
                                        key={i} 
                                        className="absolute border-2 border-green-500 bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                        style={{
                                            left: `${box[0]}px`,
                                            top: `${box[1]}px`,
                                            width: `${box[2] - box[0]}px`,
                                            height: `${box[3] - box[1]}px`,
                                        }}
                                    >
                                        <span className="bg-green-500 text-black text-xs font-bold px-1 absolute -top-5 left-0">
                                            {Math.round(box[4] * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
