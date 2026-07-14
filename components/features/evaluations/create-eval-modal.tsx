"use client";
import { X, Calculator, ClipboardList, Briefcase, Plus, Save, Trash2, ShieldAlert, ArrowRight, Paperclip, Bookmark, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModernDropdown } from "@/components/ui/modern-dropdown";

export const CreateEvalModal = (props: any) => {
  const {
  isModalOpen,
  setIsModalOpen,
  step,
  setStep,
  editingEval,
  form,
  setForm,
  evfTemplates,
  setEvfTemplates,
  newTemplateName,
  setNewTemplateName,
  selectedTemplateId,
  setSelectedTemplateId,
  handleVendorChange,
  addVendor,
  removeVendor,
  handleItemChange,
  addItem,
  removeItem,
  handleEvfChange,
  addEvfItem,
  removeEvfItem,
  currentTotalWeight,
  handleSaveTemplate,
  handleLoadTemplate,
  handleEvaluatorChange,
  handleSetPM,
  addEvaluator,
  removeEvaluator,
  handleCreateRequest,
  handleFinalSave,
} = props;
  const inputClasses = "w-full h-11 bg-white border border-gray-300 rounded-lg px-4 text-sm font-semibold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all placeholder:text-gray-400 shadow-sm";
  const labelClasses = "block text-sm font-bold text-gray-700 mb-1.5 text-right";
  const primaryBtn = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D4435] text-white hover:bg-[#0a3529] h-11 px-6 text-sm font-bold shadow-sm transition-all active:scale-95";

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                  <h3 className="text-lg font-black text-[#0D4435] flex items-center gap-2.5">
                    <div className="p-2 bg-green-50 rounded-xl text-[#0D4435]">
                      {form.type === "EVF" ? (
                        <Calculator size={18} />
                      ) : (
                        <ClipboardList size={18} />
                      )}
                    </div>
                    {editingEval
                      ? "تحديث بيانات الطلب"
                      : form.type === "EVF"
                        ? "إعداد تقييم موحد لعدة موردين (EVF)"
                        : "إضافة مطابقة فنية لعروض متعددة"}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto p-5 bg-white custom-scrollbar flex-1">
                  <form
                    id="evalForm"
                    onSubmit={
                      step === 1 ? handleCreateRequest : handleFinalSave
                    }
                    className="space-y-6"
                  >
                    <AnimatePresence mode="wait">
                      {step === 1 ? (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div>
                              <label className={labelClasses}>
                                رقم الطلب (PR){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                className={inputClasses}
                                value={form.prNumber}
                                onChange={(e) =>
                                  setForm({ ...form, prNumber: e.target.value })
                                }
                                required
                                placeholder="PR-10020"
                              />
                            </div>
                            <div>
                              <label className={labelClasses}>
                                المشروع / القسم{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                className={inputClasses}
                                value={form.projectName}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    projectName: e.target.value,
                                  })
                                }
                                required
                                placeholder="اسم المشروع..."
                              />
                            </div>
                            <div>
                              <label className={labelClasses}>
                                الموعد النهائي (Deadline){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                className={inputClasses}
                                value={form.deadline}
                                onChange={(e) =>
                                  setForm({ ...form, deadline: e.target.value })
                                }
                                required
                              />
                            </div>
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-sm font-black text-[#0D4435]">
                                {form.type === "VENDOR_PERFORMANCE" ? "بيانات المتعاقد" : "قائمة الموردين المتنافسين"}{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              {!editingEval && form.type !== "VENDOR_PERFORMANCE" && (
                                <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded-md font-bold border border-[#C5A059]/20">
                                  سيتم تجميعهم بطلب واحد
                                </span>
                              )}
                            </div>
                            <div className="space-y-4">
                              {form.vendors.map((vendor: any, vIdx: any) => (
                                <div
                                  key={vIdx}
                                  className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group"
                                >
                                  {form.vendors.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeVendor(vIdx)}
                                      className="absolute top-3 left-3 text-gray-400 hover:text-white hover:bg-red-500 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-1">
                                      <label className={labelClasses}>
                                        {form.type === "VENDOR_PERFORMANCE" ? "اسم المتعاقد" : `اسم المورد (${vIdx + 1})`}{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        className={inputClasses}
                                        value={vendor.name}
                                        onChange={(e) =>
                                          handleVendorChange(
                                            vIdx,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        required
                                        placeholder="اسم الشركة المقدمة..."
                                      />
                                    </div>
                                    <div className="md:col-span-1">
                                      <label className={labelClasses}>
                                        مرفقات العرض (اختياري)
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="file"
                                          className="hidden"
                                          id={`file-upload-${vIdx}`}
                                          onChange={(e) =>
                                            handleVendorChange(
                                              vIdx,
                                              "attachmentName",
                                              // @ts-ignore
                                              e.target.files[0]?.name || "",
                                            )
                                          }
                                        />
                                        <label
                                          htmlFor={`file-upload-${vIdx}`}
                                          className={`${inputClasses} flex items-center justify-between cursor-pointer text-gray-500 hover:border-[#C5A059] transition-colors`}
                                        >
                                          <span className="truncate text-xs">
                                            {vendor.attachmentName ||
                                              "اختر ملفاً..."}
                                          </span>
                                          <Paperclip
                                            size={16}
                                            className="shrink-0 text-[#C5A059]"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {!editingEval && (
                              <button
                                type="button"
                                onClick={addVendor}
                                className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-white text-[#C5A059] hover:bg-[#C5A059]/5 h-11 rounded-xl text-sm font-bold transition-colors"
                              >
                                <span>إضافة مورد آخر للمنافسة</span>{" "}
                                <Plus size={16} />
                              </button>
                            )}
                          </div>

                          <div className="border-t border-gray-100 pt-6">
                            {form.type === "EVF" ? (
                              <div className="space-y-4">
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-2 shadow-sm">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Bookmark
                                      size={16}
                                      className="text-[#0D4435]"
                                    />
                                    <h4 className="text-sm font-black text-[#0D4435]">
                                      إدارة القوالب الموزونة (EVF)
                                    </h4>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                      <label className="text-[11px] font-bold text-gray-500 mb-1.5 block text-right">
                                        استدعاء قالب جاهز
                                      </label>
                                      <ModernDropdown
                                        value={selectedTemplateId}
                                        // @ts-ignore
                                        options={evfTemplates.map((t) => ({
                                          label: t.name,
                                          value: t.id,
                                        }))}
                                        onChange={(val) => {
                                          // @ts-ignore
                                          setSelectedTemplateId(val);
                                          handleLoadTemplate(val);
                                        }}
                                        placeholder="اختر قالباً محفوظاً..."
                                        icon={Bookmark}
                                        className="w-full"
                                      />
                                    </div>
                                    <div className="flex-1 w-full flex gap-2 items-end">
                                      <div className="flex-1">
                                        <label className="text-[11px] font-bold text-gray-500 mb-1.5 block text-right">
                                          حفظ المعايير الحالية كقالب
                                        </label>
                                        <input
                                          type="text"
                                          className={inputClasses}
                                          placeholder="اسم القالب (مثال: أجهزة وشبكات)..."
                                          value={newTemplateName}
                                          onChange={(e) =>
                                            setNewTemplateName(e.target.value)
                                          }
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={handleSaveTemplate}
                                        className="bg-[#0D4435] text-white px-4 h-11 rounded-lg text-xs font-bold hover:bg-[#0a3529] transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
                                      >
                                        <Save size={16} /> حفظ
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                                  <span className="text-sm font-black text-gray-700">
                                    إجمالي أوزان المعايير
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-500">
                                      المجموع:
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className={`flex items-center justify-center px-4 py-1.5 rounded-lg border text-sm font-black min-w-[60px] bg-white text-gray-500 border-gray-300`}
                                      >
                                        {currentTotalWeight}
                                      </div>
                                      <span className="text-xs font-bold text-gray-600">
                                        %
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {form.evfCriteria.map((item: any, index: any) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-3"
                                    >
                                      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-xs font-black text-purple-600 border border-purple-100 shrink-0">
                                        {index + 1}
                                      </div>
                                      <input
                                        className={`${inputClasses} flex-1`}
                                        value={item.title}
                                        onChange={(e) =>
                                          handleEvfChange(
                                            index,
                                            "title",
                                            e.target.value,
                                          )
                                        }
                                        placeholder={`اسم المعيار الفني`}
                                        required
                                      />
                                      <div className="relative w-28 shrink-0">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          className={`${inputClasses} text-center font-bold pl-7 bg-gray-50`}
                                          value={item.weight}
                                          onChange={(e) =>
                                            handleEvfChange(
                                              index,
                                              "weight",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="الوزن"
                                          required
                                          dir="ltr"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">
                                          %
                                        </span>
                                      </div>
                                      {form.evfCriteria.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeEvfItem(index)}
                                          className="w-10 h-10 flex items-center justify-center text-red-500 bg-white hover:bg-red-50 border border-gray-200 rounded-lg transition-colors shrink-0"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={addEvfItem}
                                  className="mt-3 text-xs font-bold text-[#0D4435] bg-green-50 hover:bg-green-100 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full border border-green-100/50"
                                >
                                  <Plus size={16} /> إضافة معيار آخر
                                </button>
                              </div>
                            ) : (
                              <div>
                                <label className={labelClasses}>
                                  بنود المطابقة الفنية (اختياري)
                                </label>
                                <div className="space-y-3 mt-3">
                                  {form.evaluatedItems.map((item: any, index: any) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-3"
                                    >
                                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-black text-gray-500 border border-gray-200 shrink-0">
                                        {index + 1}
                                      </div>
                                      <input
                                        className={inputClasses}
                                        value={item}
                                        onChange={(e) =>
                                          handleItemChange(
                                            index,
                                            e.target.value,
                                          )
                                        }
                                        placeholder={`وصف البند`}
                                      />
                                      {form.evaluatedItems.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeItem(index)}
                                          className="w-10 h-10 flex items-center justify-center text-red-500 bg-white hover:bg-red-50 border border-gray-200 rounded-lg transition-colors shrink-0"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={addItem}
                                  className="mt-3 text-xs font-bold text-[#0D4435] bg-green-50 hover:bg-green-100 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full border border-green-100/50"
                                >
                                  <Plus size={16} /> إضافة بند آخر
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                            <AlertCircle
                              size={18}
                              className="text-blue-500 mt-0.5 shrink-0"
                            />
                            <p className="text-[11px] font-bold text-blue-800 leading-relaxed text-right">
                              سيتم إصدار رابط آمن وموحد. قم بإضافة أعضاء اللجنة
                              بالأسفل مع تحديد "مدير المشروع" المسؤول عن إضافة
                              أسباب الاستبعاد.
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-black text-[#0D4435] mb-4 text-right">
                              أعضاء لجنة التقييم الفني{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-4">
                              {form.evaluators.map((evaluator: any, index: any) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-4 p-5 bg-gray-50 border border-gray-200 rounded-xl relative shadow-sm"
                                >
                                  <div className="absolute top-0 right-0 w-8 h-8 bg-gray-200 text-gray-600 rounded-bl-lg rounded-tr-lg flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div>
                                      <label className="text-[11px] font-bold text-gray-500 mb-1.5 block text-right">
                                        الاسم الكامل{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        className={inputClasses}
                                        value={evaluator.name}
                                        onChange={(e) =>
                                          handleEvaluatorChange(
                                            index,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        required
                                        placeholder="م. يزيد..."
                                      />
                                      <label className="flex items-center gap-2 mt-3 cursor-pointer w-fit">
                                        <input
                                          type="radio"
                                          name="pmSelector"
                                          checked={evaluator.isPM}
                                          onChange={() => handleSetPM(index)}
                                          className="w-4 h-4 text-[#0D4435]"
                                        />
                                        <span className="text-[11px] font-bold text-[#0D4435]">
                                          تعيين كمدير للمشروع
                                        </span>
                                      </label>
                                    </div>
                                    <div>
                                      <label className="text-[11px] font-bold text-gray-500 mb-1.5 block text-right">
                                        البريد (اختياري)
                                      </label>
                                      <input
                                        type="email"
                                        className={inputClasses}
                                        value={evaluator.email}
                                        onChange={(e) =>
                                          handleEvaluatorChange(
                                            index,
                                            "email",
                                            e.target.value,
                                          )
                                        }
                                        dir="ltr"
                                        placeholder="email@ladun.com"
                                      />
                                    </div>
                                  </div>
                                  {form.evaluators.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeEvaluator(index)}
                                      className="mt-6 w-11 h-11 flex items-center justify-center text-red-500 bg-white border border-gray-200 hover:border-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 shadow-sm"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={addEvaluator}
                              className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#C5A059]/40 bg-[#C5A059]/5 text-[#C5A059] hover:bg-[#C5A059]/10 hover:border-[#C5A059] h-11 rounded-xl text-xs font-bold transition-colors"
                            >
                              <span>إضافة مقيم جديد</span> <Plus size={16} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
                <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center rounded-b-2xl">
                  <div className="flex-1">
                    {step === 2 && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 px-4 h-10 rounded-lg transition-all text-xs font-bold shadow-sm"
                      >
                        <span>رجوع للمعايير</span> <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      type="submit"
                      form="evalForm"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D4435] text-white hover:bg-[#0a3529] h-11 px-6 text-sm font-bold shadow-sm transition-all active:scale-95 w-full sm:w-auto"
                    >
                      {step === 1
                        ? "التالي لبيانات اللجنة"
                        : "حفظ وإنشاء الرابط"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
  );
};
