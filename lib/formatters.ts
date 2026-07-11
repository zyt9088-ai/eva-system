export const formatDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return (
    d.toLocaleDateString("ar-SA") +
    " " +
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
  );
};
