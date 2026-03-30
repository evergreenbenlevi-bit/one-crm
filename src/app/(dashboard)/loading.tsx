export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="animate-pulse h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
      <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}
