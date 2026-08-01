export function AppFooter() {
  return (
    <footer className="py-6 border-t border-gray-200 bg-white mt-auto print:hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm font-black text-[#0D4435] text-center md:text-right">
          برنامج تطوير وزارة الحرس الوطني
        </p>
        <p
          className="text-sm font-black text-gray-400 w-full md:w-auto text-left"
          dir="ltr"
        >
          Powered by Eng. Yazeed Alonazi
        </p>
      </div>
    </footer>
  );
}
