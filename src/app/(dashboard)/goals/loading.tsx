export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="animate-pulse h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      ))}
    </div>
  );
}
