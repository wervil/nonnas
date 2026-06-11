export default function GlobeLoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Loading globe...</span>
      </div>
    </div>
  );
}
