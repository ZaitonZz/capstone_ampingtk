import { Head, usePoll } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function TestAgentVerify({ result }: { result: any }) {
    // Poll the page every 1 second to update the 'result' prop
    usePoll(1000, { only: ['result'] });

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'LiveKit Agent Verification',
                    href: '/test-agent-verify',
                },
            ]}
        >
            <Head title="LiveKit Agent Verify" />

            <div className="flex h-full flex-col gap-6 p-6">
                <div className="rounded-lg border border-sidebar-border/50 bg-card p-6 text-card-foreground">
                    <h2 className="mb-4 text-xl font-semibold">
                        Python Pipeline Inference Stream
                    </h2>
                    <p className="mb-6 text-sm text-muted-foreground">
                        This page automatically polls for new frames processed
                        by the LiveKit Python agent. Start your camera in a
                        consultation room to trigger the pipeline.
                    </p>

                    <div className="overflow-auto rounded-md border border-neutral-800 bg-neutral-950 p-4">
                        {result ? (
                            <pre className="text-sm text-green-400">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        ) : (
                            <div className="flex items-center gap-2 text-yellow-500">
                                <span className="relative flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500"></span>
                                </span>
                                Waiting for data from LiveKit Agent...
                            </div>
                        )}
                    </div>

                    {result?.ml_results?.model_A?.bounding_boxes && (
                        <div className="mt-8 border-t border-sidebar-border/50 pt-6">
                            <h3 className="mb-3 text-lg font-medium">
                                Simulated Render
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Detected Faces:{' '}
                                {result.ml_results.model_A.faces_detected}
                            </p>
                            <div
                                className="relative inline-block max-h-[800px] max-w-full overflow-auto border border-dashed border-gray-600 bg-black"
                                style={{
                                    width: result.width || 640,
                                    height: result.height || 480,
                                }}
                            >
                                {result.image ? (
                                    <img
                                        src={result.image}
                                        alt="Stream Frame"
                                        className="absolute inset-0 h-full w-full object-contain"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                        Waiting for Video Feed
                                    </div>
                                )}
                                {result.ml_results.model_A.bounding_boxes.map(
                                    (box: any, i: number) => (
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
                                            <span className="absolute -top-5 left-0 bg-green-500 px-1 text-xs font-bold text-black">
                                                {Math.round(box[4] * 100)}%
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
