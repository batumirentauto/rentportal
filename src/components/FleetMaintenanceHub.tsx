import React, { useState, useEffect, useMemo } from "react";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  ShieldCheck,
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Droplet,
  Gauge,
  Calendar,
  X,
  Phone,
  Building2,
  Check,
  AlertCircle,
  Activity,
  Layers,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const FleetMaintenanceHub: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [activeSubTab, setActiveSubTab] = useState<"oil" | "issues" | "checklists" | "documents">("oil");
  const [search, setSearch] = useState<string>("");

  // Modals state
  const [isOilModalOpen, setIsOilModalOpen] = useState<boolean>(false);
  const [selectedCarForOil, setSelectedCarForOil] = useState<any | null>(null);
  const [oilNewMileage, setOilNewMileage] = useState<number>(0);
  const [oilType, setOilType] = useState<string>("5W-30 Full Synthetic");
  const [oilCost, setOilCost] = useState<number>(65);
  const [oilNotes, setOilNotes] = useState<string>("");
  const [oilTechnician, setOilTechnician] = useState<string>("Дежурный техник");

  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [issueCarId, setIssueCarId] = useState<string>("");
  const [issueCategory, setIssueCategory] = useState<string>("SUSPENSION");
  const [issueTitle, setIssueTitle] = useState<string>("");
  const [issueDescription, setIssueDescription] = useState<string>("");
  const [issuePriority, setIssuePriority] = useState<string>("MEDIUM");
  const [issueDetectedBy, setIssueDetectedBy] = useState<string>("Менеджер смены");
  const [issueDetectedMileage, setIssueDetectedMileage] = useState<number>(50000);
  const [issueStationName, setIssueStationName] = useState<string>("Tegeta Motors");

  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);
  const [resolvingIssue, setResolvingIssue] = useState<any | null>(null);
  const [resolveRepairCost, setResolveRepairCost] = useState<number>(50);
  const [resolveRepairNotes, setResolveRepairNotes] = useState<string>("");

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState<boolean>(false);
  const [checklistCarId, setChecklistCarId] = useState<string>("");
  const [chkInspectorName, setChkInspectorName] = useState<string>("Шеф-механик Малхаз");
  const [chkMileage, setChkMileage] = useState<number>(50000);
  const [chkOverall, setChkOverall] = useState<string>("GOOD");
  const [chkOilLevel, setChkOilLevel] = useState<string>("OK");
  const [chkBrakeFluid, setChkBrakeFluid] = useState<string>("OK");
  const [chkCoolant, setChkCoolant] = useState<string>("OK");
  const [chkTireCondition, setChkTireCondition] = useState<string>("GOOD");
  const [chkTirePressure, setChkTirePressure] = useState<number>(2.3);
  const [chkBrakePadsWear, setChkBrakePadsWear] = useState<number>(30);
  const [chkLightsOk, setChkLightsOk] = useState<boolean>(true);
  const [chkWipersOk, setChkWipersOk] = useState<boolean>(true);
  const [chkAcOk, setChkAcOk] = useState<boolean>(true);
  const [chkSuspensionNoiseOk, setChkSuspensionNoiseOk] = useState<boolean>(true);
  const [chkEmergencyKitOk, setChkEmergencyKitOk] = useState<boolean>(true);
  const [chkNotes, setChkNotes] = useState<string>("");

  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [docsCar, setDocsCar] = useState<any | null>(null);
  const [docsInspectionExpiry, setDocsInspectionExpiry] = useState<string>("");
  const [docsInspectionNumber, setDocsInspectionNumber] = useState<string>("");
  const [docsInsuranceCompany, setDocsInsuranceCompany] = useState<string>("Aldagi");
  const [docsInsurancePolicy, setDocsInsurancePolicy] = useState<string>("");
  const [docsInsuranceExpiry, setDocsInsuranceExpiry] = useState<string>("");
  const [docsInsuranceDeductible, setDocsInsuranceDeductible] = useState<number>(300);
  const [docsHasBatumiParking, setDocsHasBatumiParking] = useState<boolean>(false);
  const [docsBatumiParkingNumber, setDocsBatumiParkingNumber] = useState<string>("");
  const [docsBatumiParkingExpiresAt, setDocsBatumiParkingExpiresAt] = useState<string>("");
  const [docsBatumiParkingCost, setDocsBatumiParkingCost] = useState<number>(40);
  const [docsRecordParkingExpense, setDocsRecordParkingExpense] = useState<boolean>(false);
  const [docsHasGpsTracker, setDocsHasGpsTracker] = useState<boolean>(true);
  const [docsGpsMonthlyFee, setDocsGpsMonthlyFee] = useState<number>(10);
  const [docsIsGpsFeeChargedToOwner, setDocsIsGpsFeeChargedToOwner] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fleet/maintenance?city=${cityFilter}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [cityFilter]);

  // Open Oil Modal
  const handleOpenOilModal = (car: any) => {
    setSelectedCarForOil(car);
    setOilNewMileage(car.currentMileage);
    setOilType(car.oil.oilType || "5W-30 Full Synthetic");
    setIsOilModalOpen(true);
  };

  // Submit Oil Change
  const handleSubmitOil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarForOil) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OIL_CHANGE",
          carId: selectedCarForOil.id,
          currentMileage: oilNewMileage,
          oilType,
          cost: oilCost,
          notes: oilNotes,
          technicianName: oilTechnician,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsOilModalOpen(false);
        fetchMaintenanceData();
      } else {
        alert("Ошибка: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Issue Modal
  const handleOpenIssueModal = (car?: any) => {
    if (car) {
      setIssueCarId(car.id);
      setIssueDetectedMileage(car.currentMileage);
    } else if (data?.cars?.length > 0) {
      setIssueCarId(data.cars[0].id);
      setIssueDetectedMileage(data.cars[0].currentMileage);
    }
    setIssueTitle("");
    setIssueDescription("");
    setIssueCategory("SUSPENSION");
    setIssuePriority("MEDIUM");
    setIsIssueModalOpen(true);
  };

  // Submit Issue
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueCarId || !issueTitle) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPORT_ISSUE",
          carId: issueCarId,
          category: issueCategory,
          title: issueTitle,
          description: issueDescription,
          priority: issuePriority,
          detectedBy: issueDetectedBy,
          detectedMileage: issueDetectedMileage,
          serviceStationName: issueStationName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsIssueModalOpen(false);
        fetchMaintenanceData();
      } else {
        alert("Ошибка: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Resolve Issue Modal
  const handleOpenResolveModal = (issue: any) => {
    setResolvingIssue(issue);
    setResolveRepairCost(issue.repairCost || 50);
    setResolveRepairNotes(issue.repairNotes || "");
    setIsResolveModalOpen(true);
  };

  // Submit Resolve Issue
  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssue) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: resolvingIssue.id,
          status: "RESOLVED",
          repairCost: resolveRepairCost,
          repairNotes: resolveRepairNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsResolveModalOpen(false);
        fetchMaintenanceData();
      } else {
        alert("Ошибка: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Checklist Modal
  const handleOpenChecklistModal = (car?: any) => {
    if (car) {
      setChecklistCarId(car.id);
      setChkMileage(car.currentMileage);
    } else if (data?.cars?.length > 0) {
      setChecklistCarId(data.cars[0].id);
      setChkMileage(data.cars[0].currentMileage);
    }
    setChkOverall("GOOD");
    setChkOilLevel("OK");
    setChkBrakeFluid("OK");
    setChkCoolant("OK");
    setChkTireCondition("GOOD");
    setChkTirePressure(2.3);
    setChkBrakePadsWear(30);
    setChkNotes("");
    setIsChecklistModalOpen(true);
  };

  // Submit Checklist
  const handleSubmitChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistCarId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_CHECKLIST",
          carId: checklistCarId,
          inspectorName: chkInspectorName,
          mileageAtCheck: chkMileage,
          overallCondition: chkOverall,
          engineOilLevel: chkOilLevel,
          brakeFluidLevel: chkBrakeFluid,
          coolantLevel: chkCoolant,
          tireCondition: chkTireCondition,
          tirePressureBar: chkTirePressure,
          brakePadsWearPerc: chkBrakePadsWear,
          exteriorLightsOk: chkLightsOk,
          wipersAndWashOk: chkWipersOk,
          airConditioningOk: chkAcOk,
          suspensionNoiseOk: chkSuspensionNoiseOk,
          emergencyKitOk: chkEmergencyKitOk,
          notes: chkNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsChecklistModalOpen(false);
        fetchMaintenanceData();
      } else {
        alert("Ошибка: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Docs Modal
  const handleOpenDocsModal = (car: any) => {
    setDocsCar(car);
    setDocsInspectionExpiry(car.inspection.expiryDate ? car.inspection.expiryDate.split("T")[0] : "");
    setDocsInspectionNumber(car.inspection.number || "");
    setDocsInsuranceCompany(car.insurance.company || "Aldagi");
    setDocsInsurancePolicy(car.insurance.policyNumber || "");
    setDocsInsuranceExpiry(car.insurance.expiryDate ? car.insurance.expiryDate.split("T")[0] : "");
    setDocsInsuranceDeductible(car.insurance.deductible || 300);
    setDocsHasBatumiParking(Boolean(car.batumiParking?.hasParking));
    setDocsBatumiParkingNumber(car.batumiParking?.permitNumber || "");
    setDocsBatumiParkingExpiresAt(car.batumiParking?.expiresAt ? car.batumiParking.expiresAt.split("T")[0] : "");
    setDocsBatumiParkingCost(car.batumiParking?.cost || 40);
    setDocsRecordParkingExpense(false);
    setDocsHasGpsTracker(car.gps?.hasGps !== false);
    setDocsGpsMonthlyFee(car.gps?.monthlyFee || 10);
    setDocsIsGpsFeeChargedToOwner(car.gps?.isChargedToOwner !== false);
    setIsDocsModalOpen(true);
  };

  // Submit Docs Update
  const handleSubmitDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docsCar) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DOCS",
          carId: docsCar.id,
          inspectionExpiryDate: docsInspectionExpiry || undefined,
          inspectionNumber: docsInspectionNumber,
          insuranceCompany: docsInsuranceCompany,
          insurancePolicyNumber: docsInsurancePolicy,
          insuranceExpiryDate: docsInsuranceExpiry || undefined,
          insuranceDeductible: docsInsuranceDeductible,
          hasBatumiParking: docsHasBatumiParking,
          batumiParkingPermitNumber: docsBatumiParkingNumber,
          batumiParkingExpiresAt: docsBatumiParkingExpiresAt || undefined,
          batumiParkingCost: docsBatumiParkingCost,
          recordParkingExpense: docsRecordParkingExpense,
          hasGpsTracker: docsHasGpsTracker,
          gpsMonthlyFee: docsGpsMonthlyFee,
          isGpsFeeChargedToOwner: docsIsGpsFeeChargedToOwner,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDocsModalOpen(false);
        fetchMaintenanceData();
      } else {
        alert("Ошибка: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCategory = (cat: string) => {
    switch (cat) {
      case "SUSPENSION":
        return { label: "Подвеска & Ходовая", icon: "🛞", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
      case "BRAKES":
        return { label: "Тормозная система", icon: "🛑", color: "bg-red-500/20 text-red-300 border-red-500/30" };
      case "ENGINE_TRANSMISSION":
        return { label: "Двигатель & КПП", icon: "⚙️", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "ELECTRICAL_CHECK_ENGINE":
        return { label: "Электрика & Check", icon: "⚡", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "CLIMATE_AC":
        return { label: "Кондиционер & Климат", icon: "❄️", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" };
      case "TIRES":
        return { label: "Шины & Диски", icon: "🔘", color: "bg-slate-700 text-slate-200 border-slate-600" };
      default:
        return { label: "Кузов & Стекла", icon: "🚗", color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black px-2.5 py-0.5 rounded-full uppercase">
                ТО & Сервис Автопарка
              </span>
              <span className="text-xs text-slate-400">
                Пробеги • Замена масла • Неисправности узлов • Техосмотры • Страховки
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>Система управления автопарком и сервисным обслуживанием</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Контроль пробегов и ресурса масла, регистрация симптомов неисправностей для автосервиса,
              учет диагностических карт техосмотра (PTI), полисов КАСКО/ОСАГО и еженедельный чек-лист технического состояния.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenChecklistModal()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center space-x-1.5"
            >
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <span>+ Чек-лист осмотра</span>
            </button>
            <button
              onClick={() => handleOpenIssueModal()}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>+ Неисправность на СТО</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Alert Cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
            {/* Oil Alert */}
            <div
              onClick={() => setActiveSubTab("oil")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                data.summary.totalOilDue > 0
                  ? "bg-amber-950/30 border-amber-500/50 hover:border-amber-400"
                  : "bg-slate-950/70 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Контроль масла:</span>
                <Droplet className={`w-4 h-4 ${data.summary.totalOilDue > 0 ? "text-amber-400" : "text-slate-500"}`} />
              </div>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {data.summary.totalOilDue} <span className="text-xs text-amber-400 font-normal">требуют замены</span>
              </div>
            </div>

            {/* Open Issues Alert */}
            <div
              onClick={() => setActiveSubTab("issues")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                data.summary.totalOpenIssues > 0
                  ? "bg-red-950/30 border-red-500/50 hover:border-red-400"
                  : "bg-slate-950/70 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Неисправности СТО:</span>
                <Wrench className={`w-4 h-4 ${data.summary.totalOpenIssues > 0 ? "text-red-400" : "text-slate-500"}`} />
              </div>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {data.summary.totalOpenIssues} <span className="text-xs text-red-400 font-normal">активных заявок</span>
              </div>
            </div>

            {/* Inspection Alert */}
            <div
              onClick={() => setActiveSubTab("documents")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                data.summary.totalInspectionExpiring > 0
                  ? "bg-purple-950/30 border-purple-500/50 hover:border-purple-400"
                  : "bg-slate-950/70 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Техосмотры (PTI):</span>
                <ShieldCheck className={`w-4 h-4 ${data.summary.totalInspectionExpiring > 0 ? "text-purple-400" : "text-slate-500"}`} />
              </div>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {data.summary.totalInspectionExpiring} <span className="text-xs text-purple-400 font-normal">к продлению</span>
              </div>
            </div>

            {/* Insurance Alert */}
            <div
              onClick={() => setActiveSubTab("documents")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                data.summary.totalInsuranceExpiring > 0
                  ? "bg-blue-950/30 border-blue-500/50 hover:border-blue-400"
                  : "bg-slate-950/70 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Страховки КАСКО:</span>
                <FileText className={`w-4 h-4 ${data.summary.totalInsuranceExpiring > 0 ? "text-blue-400" : "text-slate-500"}`} />
              </div>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {data.summary.totalInsuranceExpiring} <span className="text-xs text-blue-400 font-normal">к продлению</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* City Filters & Sub-tab navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Subtabs */}
        <div className="flex space-x-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveSubTab("oil")}
            className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition ${
              activeSubTab === "oil"
                ? "bg-amber-500 text-slate-950 font-black shadow-lg"
                : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>🛢️ Пробеги & Замена масла</span>
          </button>

          <button
            onClick={() => setActiveSubTab("issues")}
            className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition ${
              activeSubTab === "issues"
                ? "bg-red-600 text-white font-black shadow-lg"
                : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>🔧 Неисправности & Сервис узлов</span>
            {data?.summary?.totalOpenIssues > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {data.summary.totalOpenIssues}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("checklists")}
            className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition ${
              activeSubTab === "checklists"
                ? "bg-emerald-600 text-white font-black shadow-lg"
                : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>📋 Чек-листы техсостояния</span>
          </button>

          <button
            onClick={() => setActiveSubTab("documents")}
            className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition ${
              activeSubTab === "documents"
                ? "bg-purple-600 text-white font-black shadow-lg"
                : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>📑 Техосмотры (PTI) & Страховки</span>
          </button>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCityFilter("ALL")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
              cityFilter === "ALL" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Все города
          </button>
          <button
            onClick={() => setCityFilter("TBS")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
              cityFilter === "TBS" ? "bg-amber-500 text-slate-950 font-bold" : "text-amber-300 hover:text-white"
            }`}
          >
            🏛️ TBS
          </button>
          <button
            onClick={() => setCityFilter("BUS")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
              cityFilter === "BUS" ? "bg-cyan-400 text-slate-950 font-bold" : "text-cyan-300 hover:text-white"
            }`}
          >
            🌊 BUS
          </button>
          <button
            onClick={() => setCityFilter("KUT")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
              cityFilter === "KUT" ? "bg-emerald-500 text-slate-950 font-bold" : "text-emerald-300 hover:text-white"
            }`}
          >
            🌿 KUT
          </button>
        </div>
      </div>

      {/* SUBTAB 1: OIL CONTROL & MILEAGE */}
      {activeSubTab === "oil" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Автомобиль</th>
                  <th className="py-3.5 px-3">Текущий пробег</th>
                  <th className="py-3.5 px-3">Прошлая замена масла</th>
                  <th className="py-3.5 px-4">Остаток ресурса масла</th>
                  <th className="py-3.5 px-3">Тип масла</th>
                  <th className="py-3.5 px-3">Статус</th>
                  <th className="py-3.5 px-4 text-center">Действие</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                      <span>Загрузка данных по замене масла...</span>
                    </td>
                  </tr>
                ) : (
                  data?.cars?.map((car: any) => {
                    const oil = car.oil;
                    const isOverdue = oil.oilStatus === "OVERDUE";
                    const isDueSoon = oil.oilStatus === "DUE_SOON";
                    const kmRemaining = oil.kmUntilOilChange;

                    return (
                      <tr key={car.id} className="hover:bg-slate-850/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">
                            {car.brand} {car.model}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700">
                              {car.plateNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">{car.cityName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-mono font-bold text-sm text-white">
                            {car.currentMileage.toLocaleString()} км
                          </div>
                          <span className="text-[10px] text-slate-500">одометр</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-mono text-xs text-slate-300">
                            {oil.lastOilChangeMileage.toLocaleString()} км
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {oil.lastOilChangeDate ? new Date(oil.lastOilChangeDate).toLocaleDateString("ru-RU") : "При вводе"}
                          </span>
                        </td>

                        {/* Remaining km bar */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-[160px]">
                            <div className="flex justify-between items-center text-[11px] font-mono font-bold">
                              <span className={isOverdue ? "text-red-400" : isDueSoon ? "text-amber-400" : "text-emerald-400"}>
                                {isOverdue ? `Перепробег: ${Math.abs(kmRemaining)} км` : `${kmRemaining.toLocaleString()} км`}
                              </span>
                              <span className="text-[9px] text-slate-500">/ 8,000 км</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div
                                style={{ width: `${Math.max(5, Math.min(100, (kmRemaining / 8000) * 100))}%` }}
                                className={`h-full rounded-full transition-all ${
                                  isOverdue
                                    ? "bg-red-500 animate-pulse"
                                    : isDueSoon
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[11px] text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {oil.oilType}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {isOverdue ? (
                            <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] px-2.5 py-1 rounded-lg font-black inline-flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span>СРОЧНО МАСЛО</span>
                            </span>
                          ) : isDueSoon ? (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2.5 py-1 rounded-lg font-bold inline-flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Скоро замена</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-1 rounded-lg font-bold inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Ресурс в норме</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenOilModal(car)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center space-x-1 mx-auto"
                          >
                            <Droplet className="w-3 h-3 text-amber-400" />
                            <span>Замена масла</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: FAULTS & SERVICE ISSUES */}
      {activeSubTab === "issues" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white">Реестр неисправностей по узлам и агрегатам</h3>
              <p className="text-xs text-slate-400">Фиксация дефектов для передачи в автосервис и контроль заказ-нарядов</p>
            </div>
            <button
              onClick={() => handleOpenIssueModal()}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить неисправность</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.cars?.flatMap((c: any) =>
              c.issues.all.map((issue: any) => ({ ...issue, car: c }))
            )?.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-white text-base">Все автомобили исправны!</p>
                <p className="text-xs text-slate-500 mt-1">Открытых неисправностей или заявок на автосервис нет</p>
              </div>
            ) : (
              data?.cars
                ?.flatMap((c: any) =>
                  c.issues.all.map((issue: any) => ({ ...issue, car: c }))
                )
                ?.sort((a: any, b: any) => (a.status === "RESOLVED" ? 1 : -1))
                ?.map((issue: any) => {
                  const cat = formatCategory(issue.category);
                  const isResolved = issue.status === "RESOLVED";

                  return (
                    <div
                      key={issue.id}
                      className={`border rounded-2xl p-4 shadow-lg space-y-3 transition ${
                        isResolved
                          ? "bg-slate-900/60 border-slate-800/80 opacity-75"
                          : issue.priority === "CRITICAL"
                          ? "bg-red-950/20 border-red-500/60 ring-1 ring-red-500/40"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-black text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                              {issue.car.plateNumber}
                            </span>
                            <span className="font-bold text-white text-sm">
                              {issue.car.brand} {issue.car.model}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cat.color}`}>
                              {cat.icon} {cat.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-sm mt-1.5">{issue.title}</h4>
                        </div>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            issue.priority === "CRITICAL"
                              ? "bg-red-600 text-white animate-pulse"
                              : issue.priority === "HIGH"
                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {issue.priority}
                        </span>
                      </div>

                      {issue.description && (
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                          {issue.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-slate-800 text-slate-400">
                        <div className="flex items-center space-x-3">
                          <span>Обнаружил: <strong>{issue.detectedBy}</strong></span>
                          {issue.detectedMileage && (
                            <span className="font-mono">на {issue.detectedMileage.toLocaleString()} км</span>
                          )}
                          {issue.serviceStationName && (
                            <span className="text-amber-300 font-semibold flex items-center space-x-1">
                              <Building2 className="w-3 h-3" />
                              <span>{issue.serviceStationName}</span>
                            </span>
                          )}
                        </div>

                        {/* Status / Action */}
                        <div>
                          {isResolved ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg font-bold flex items-center space-x-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Устранено (${issue.repairCost} USD)</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenResolveModal(issue)}
                              className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow text-xs flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Акт ремонта / Устранено</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {issue.repairNotes && (
                        <div className="text-[11px] text-emerald-300/90 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                          🛠️ <strong>Отчет СТО:</strong> {issue.repairNotes}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: TECHNICAL CHECKLISTS */}
      {activeSubTab === "checklists" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white">Чек-листы технического состояния авто</h3>
              <p className="text-xs text-slate-400">Ревизия жидкостей, шин, тормозных колодок и комплекта безопасности</p>
            </div>
            <button
              onClick={() => handleOpenChecklistModal()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Провести чек-лист осмотра</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.cars?.map((car: any) => {
              const chk = car.lastChecklist;

              return (
                <div key={car.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <div className="font-bold text-white text-sm">{car.brand} {car.model}</div>
                      <span className="font-mono text-xs text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700">
                        {car.plateNumber}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenChecklistModal(car)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
                    >
                      Новый осмотр
                    </button>
                  </div>

                  {chk ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Общее состояние:</span>
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          chk.overallCondition === "EXCELLENT" || chk.overallCondition === "GOOD"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {chk.overallCondition === "EXCELLENT" ? "Идеальное" : chk.overallCondition === "GOOD" ? "Хорошее" : "Требует внимания"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
                        <div>Масло ДВС: <strong className="text-white">{chk.engineOilLevel}</strong></div>
                        <div>Тормозуха: <strong className="text-white">{chk.brakeFluidLevel}</strong></div>
                        <div>Антифриз: <strong className="text-white">{chk.coolantLevel}</strong></div>
                        <div>Давление шин: <strong className="text-white">{chk.tirePressureBar} Bar</strong></div>
                        <div>Износ колодок: <strong className="text-amber-400">{chk.brakePadsWearPerc}%</strong></div>
                        <div>Аварийный набор: <strong className="text-emerald-400">{chk.emergencyKitOk ? "✓ Есть" : "✗ Нет"}</strong></div>
                      </div>

                      {chk.notes && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg">
                          “{chk.notes}”
                        </p>
                      )}

                      <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                        <span>Проверял: {chk.inspectorName}</span>
                        <span>{new Date(chk.checkedAt).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      <span>Чек-лист ещё не проводился</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: INSPECTION (PTI) & INSURANCE */}
      {activeSubTab === "documents" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Автомобиль</th>
                  <th className="py-3.5 px-3">Диагностическая карта ТО (PTI)</th>
                  <th className="py-3.5 px-3">Срок действия ТО</th>
                  <th className="py-3.5 px-3">Страховая компания & Полис</th>
                  <th className="py-3.5 px-3">Срок действия КАСКО</th>
                  <th className="py-3.5 px-3">Франшиза</th>
                  <th className="py-3.5 px-3">Парковка Батуми</th>
                  <th className="py-3.5 px-3">GPS Мониторинг</th>
                  <th className="py-3.5 px-4 text-center">Действие</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {data?.cars?.map((car: any) => {
                  const insp = car.inspection;
                  const ins = car.insurance;

                  const isInspExpired = insp.status === "EXPIRED";
                  const isInspSoon = insp.status === "EXPIRING_SOON";

                  const isInsExpired = ins.status === "EXPIRED";
                  const isInsSoon = ins.status === "EXPIRING_SOON";

                  return (
                    <tr key={car.id} className="hover:bg-slate-850/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">
                          {car.brand} {car.model}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700">
                            {car.plateNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">{car.cityName}</span>
                        </div>
                      </td>

                      {/* PTI Card */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-xs text-white font-bold">
                          {insp.number || "—"}
                        </div>
                        <span className="text-[10px] text-slate-500">Гостехосмотр Грузии</span>
                      </td>

                      {/* PTI Expiry */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-xs">
                          {insp.expiryDate ? new Date(insp.expiryDate).toLocaleDateString("ru-RU") : "Не указан"}
                        </div>
                        {isInspExpired ? (
                          <span className="text-[10px] text-red-400 font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>ПРОСРОЧЕН!</span>
                          </span>
                        ) : isInspSoon ? (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Осталось {insp.daysRemaining} дн.
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400">
                            Действует ({insp.daysRemaining} дн.)
                          </span>
                        )}
                      </td>

                      {/* Insurance Company & Policy */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white text-xs">{ins.company}</div>
                        <div className="font-mono text-[11px] text-slate-400">{ins.policyNumber}</div>
                      </td>

                      {/* Insurance Expiry */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-xs">
                          {ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString("ru-RU") : "Не указан"}
                        </div>
                        {isInsExpired ? (
                          <span className="text-[10px] text-red-400 font-bold">ПРОСРОЧЕНА!</span>
                        ) : isInsSoon ? (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Осталось {ins.daysRemaining} дн.
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-400">
                            Активна ({ins.daysRemaining} дн.)
                          </span>
                        )}
                      </td>

                      {/* Deductible */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {ins.deductible} ₾
                        </span>
                      </td>

                      {/* Batumi Parking */}
                      <td className="py-3.5 px-3">
                        {car.batumiParking?.hasParking ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                🅿️ Батуми
                              </span>
                              {car.batumiParking.permitNumber && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  #{car.batumiParking.permitNumber}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px]">
                              {car.batumiParking.expiresAt ? (
                                car.batumiParking.isValid ? (
                                  <span className="text-emerald-400">
                                    до {new Date(car.batumiParking.expiresAt).toLocaleDateString("ru-RU")}
                                    {car.batumiParking.daysRemaining !== null && ` (${car.batumiParking.daysRemaining}д)`}
                                  </span>
                                ) : (
                                  <span className="text-red-400 font-bold flex items-center space-x-0.5">
                                    <AlertTriangle className="w-3 h-3 text-red-400 inline" />
                                    <span>ПРОСРОЧЕНО!</span>
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400">Бессрочно</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Нет</span>
                        )}
                      </td>

                      {/* GPS */}
                      <td className="py-3.5 px-3">
                        {car.gps?.hasGps ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              <span>🛰️ GPS</span>
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {car.gps?.monthlyFee || 10} ₾/мес
                              <span className="text-slate-500 block text-[9px]">
                                {car.gps?.isChargedToOwner ? "владелец" : "автопрокат"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Нет</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenDocsModal(car)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
                        >
                          Изменить данные
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: OIL CHANGE */}
      {isOilModalOpen && selectedCarForOil && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase">Фиксация замены масла</span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {selectedCarForOil.brand} {selectedCarForOil.model} ({selectedCarForOil.plateNumber})
                </h3>
              </div>
              <button onClick={() => setIsOilModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOil} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Текущий пробег при замене (км):</label>
                <input
                  type="number"
                  value={oilNewMileage}
                  onChange={(e) => setOilNewMileage(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Марка и вязкость масла:</label>
                <select
                  value={oilType}
                  onChange={(e) => setOilType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="5W-30 Full Synthetic">5W-30 Full Synthetic (Toyota/Hyundai/Kia/Nissan)</option>
                  <option value="0W-20 Full Synthetic">0W-20 Full Synthetic (Prius Hybrid/Lexus/Subaru)</option>
                  <option value="5W-40 Synthetic">5W-40 Synthetic (Mercedes/BMW)</option>
                  <option value="10W-40 Semi-Synthetic">10W-40 Semi-Synthetic</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Затраты на ТО ($):</label>
                  <input
                    type="number"
                    value={oilCost}
                    onChange={(e) => setOilCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Мастер / Сервис:</label>
                  <input
                    type="text"
                    value={oilTechnician}
                    onChange={(e) => setOilTechnician(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Заметки (фильтры, промывка):</label>
                <textarea
                  rows={2}
                  value={oilNotes}
                  onChange={(e) => setOilNotes(e.target.value)}
                  placeholder="Заменен масляный и воздушный фильтр Mann..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOilModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl shadow transition"
                >
                  {isSubmitting ? "Сохранение..." : "Зафиксировать замену"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT MALFUNCTION / ISSUE */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-red-400 font-bold uppercase">Заявка на диагностику и автосервис</span>
                <h3 className="text-base font-black text-white mt-0.5">Фиксация неисправности узла/агрегата</h3>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Автомобиль:</label>
                <select
                  value={issueCarId}
                  onChange={(e) => setIssueCarId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  {data?.cars?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.plateNumber}) • {c.cityName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Узел / Агрегат:</label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="SUSPENSION">🛞 Подвеска & Ходовая</option>
                    <option value="BRAKES">🛑 Тормозная система</option>
                    <option value="ENGINE_TRANSMISSION">⚙️ Двигатель & АКПП</option>
                    <option value="ELECTRICAL_CHECK_ENGINE">⚡ Электрика & Check Engine</option>
                    <option value="CLIMATE_AC">❄️ Кондиционер & Печка</option>
                    <option value="TIRES">🔘 Шины & Диски</option>
                    <option value="BODY_GLASS_LIGHTS">🚗 Кузов, Стекла, Фары</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Приоритет:</label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="LOW">Низкий (до планового ТО)</option>
                    <option value="MEDIUM">Средний (запланировать СТО)</option>
                    <option value="HIGH">Высокий (устранить до аренды)</option>
                    <option value="CRITICAL">КРИТИЧЕСКИЙ (запрет выезда!)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Краткая суть неисправности:</label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="Например: Стук справа в передней подвеске на ямах"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Подробные симптомы и дефекты:</label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Опишите, когда проявляется звук, вибрации, потеря тяги, запах гари..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Сервис / СТО:</label>
                  <input
                    type="text"
                    value={issueStationName}
                    onChange={(e) => setIssueStationName(e.target.value)}
                    placeholder="Tegeta Motors, Amboli..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Кто зафиксировал:</label>
                  <input
                    type="text"
                    value={issueDetectedBy}
                    onChange={(e) => setIssueDetectedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black rounded-xl shadow transition"
                >
                  {isSubmitting ? "Отправка..." : "Отправить на сервис"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESOLVE ISSUE / REPAIR COMPLETION */}
      {isResolveModalOpen && resolvingIssue && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase">Акт устранения неисправности</span>
                <h3 className="text-base font-black text-white mt-0.5">{resolvingIssue.title}</h3>
              </div>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Итоговая стоимость ремонта ($):</label>
                <input
                  type="number"
                  value={resolveRepairCost}
                  onChange={(e) => setResolveRepairCost(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Выполненные работы / отчет СТО:</label>
                <textarea
                  rows={3}
                  value={resolveRepairNotes}
                  onChange={(e) => setResolveRepairNotes(e.target.value)}
                  placeholder="Заменены передние колодки, проточены диски, люфты устранены..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow transition"
                >
                  {isSubmitting ? "Сохранение..." : "Подтвердить устранение"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TECHNICAL CONDITION CHECKLIST */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase">Чек-лист технического состояния</span>
                <h3 className="text-base font-black text-white mt-0.5">Комплексная ревизия автомобиля</h3>
              </div>
              <button onClick={() => setIsChecklistModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitChecklist} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Автомобиль:</label>
                  <select
                    value={checklistCarId}
                    onChange={(e) => setChecklistCarId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    {data?.cars?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.brand} {c.model} ({c.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Пробег при проверке (км):</label>
                  <input
                    type="number"
                    value={chkMileage}
                    onChange={(e) => setChkMileage(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Fluids & Levels */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">1. Уровни технических жидкостей:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Масло ДВС:</label>
                    <select
                      value={chkOilLevel}
                      onChange={(e) => setChkOilLevel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                    >
                      <option value="OK">Уровень в норме</option>
                      <option value="LOW">Ниже отметки MIN</option>
                      <option value="NEEDS_REFILL">Требуется долив</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Тормозная жидкость:</label>
                    <select
                      value={chkBrakeFluid}
                      onChange={(e) => setChkBrakeFluid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                    >
                      <option value="OK">В норме</option>
                      <option value="LOW">Низкий уровень</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Антифриз:</label>
                    <select
                      value={chkCoolant}
                      onChange={(e) => setChkCoolant(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                    >
                      <option value="OK">В норме</option>
                      <option value="LOW">Требует долива</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tires & Brakes */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">2. Шины и тормоза:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Давление шин (Bar):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={chkTirePressure}
                      onChange={(e) => setChkTirePressure(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Износ колодок (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={chkBrakePadsWear}
                      onChange={(e) => setChkBrakePadsWear(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-amber-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Состояние резины:</label>
                    <select
                      value={chkTireCondition}
                      onChange={(e) => setChkTireCondition(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                    >
                      <option value="GOOD">Хорошее</option>
                      <option value="WORN">Умеренный износ</option>
                      <option value="NEEDS_REPLACEMENT">Требует замены</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Checkbox checks */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">3. Оборудование и светотехника:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkLightsOk}
                      onChange={(e) => setChkLightsOk(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Фары, стоп-сигналы, поворотники</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkWipersOk}
                      onChange={(e) => setChkWipersOk(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Дворники и омыватель</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkAcOk}
                      onChange={(e) => setChkAcOk(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Кондиционер и отопитель</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkEmergencyKitOk}
                      onChange={(e) => setChkEmergencyKitOk(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Запаска, домкрат, аптечка, знак</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Итоговое заключение:</label>
                <select
                  value={chkOverall}
                  onChange={(e) => setChkOverall(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
                >
                  <option value="EXCELLENT">Идеальное (готов к выдаче VIP)</option>
                  <option value="GOOD">Хорошее (замечаний нет)</option>
                  <option value="NEEDS_ATTENTION">Требует внимания / мелкого сервиса</option>
                  <option value="CRITICAL_DEFECTS">Критические дефекты (не выдавать)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl shadow transition"
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить чек-лист"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PTI & INSURANCE UPDATE */}
      {isDocsModalOpen && docsCar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <span className="text-xs text-purple-400 font-bold uppercase">Документы, Парковка & GPS</span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {docsCar.brand} {docsCar.model} ({docsCar.plateNumber})
                </h3>
              </div>
              <button onClick={() => setIsDocsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDocs} className="space-y-3 text-xs">
              <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30 space-y-2">
                <span className="text-purple-300 font-bold block">Диагностическая карта ТО (PTI):</span>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Номер карты ТО:</label>
                  <input
                    type="text"
                    value={docsInspectionNumber}
                    onChange={(e) => setDocsInspectionNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Дата окончания ТО:</label>
                  <input
                    type="date"
                    value={docsInspectionExpiry}
                    onChange={(e) => setDocsInspectionExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="bg-blue-950/20 p-3 rounded-xl border border-blue-500/30 space-y-2">
                <span className="text-blue-300 font-bold block">Полис страхования (КАСКО):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Страховая компания:</label>
                    <select
                      value={docsInsuranceCompany}
                      onChange={(e) => setDocsInsuranceCompany(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                    >
                      <option value="Aldagi">Aldagi</option>
                      <option value="TBC Insurance">TBC Insurance</option>
                      <option value="GPI Holding">GPI Holding</option>
                      <option value="Ardi Insurance">Ardi Insurance</option>
                      <option value="Irao">Irao</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Франшиза (₾ GEL):</label>
                    <input
                      type="number"
                      value={docsInsuranceDeductible}
                      onChange={(e) => setDocsInsuranceDeductible(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Номер полиса:</label>
                  <input
                    type="text"
                    value={docsInsurancePolicy}
                    onChange={(e) => setDocsInsurancePolicy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Дата окончания страховки:</label>
                  <input
                    type="date"
                    value={docsInsuranceExpiry}
                    onChange={(e) => setDocsInsuranceExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Batumi Parking Section */}
              <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold block">🅿️ Парковочное разрешение (Батуми):</span>
                  <label className="flex items-center space-x-1.5 text-[11px] text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsHasBatumiParking}
                      onChange={(e) => setDocsHasBatumiParking(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Разрешение активно</span>
                  </label>
                </div>

                {docsHasBatumiParking && (
                  <div className="space-y-2 pt-2 border-t border-amber-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Номер стикера / абонемента:</label>
                        <input
                          type="text"
                          value={docsBatumiParkingNumber}
                          onChange={(e) => setDocsBatumiParkingNumber(e.target.value)}
                          placeholder="BAT-2026-..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Действует до:</label>
                        <input
                          type="date"
                          value={docsBatumiParkingExpiresAt}
                          onChange={(e) => setDocsBatumiParkingExpiresAt(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Стоимость (₾ GEL):</label>
                        <input
                          type="number"
                          value={docsBatumiParkingCost}
                          onChange={(e) => setDocsBatumiParkingCost(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-xs"
                        />
                      </div>
                      <div className="pt-3">
                        <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={docsRecordParkingExpense}
                            onChange={(e) => setDocsRecordParkingExpense(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <span>Списать в расходы владельца</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GPS Tracking Section */}
              <div className="bg-cyan-950/20 p-3 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold block">🛰️ GPS Мониторинг & Трекер:</span>
                  <label className="flex items-center space-x-1.5 text-[11px] text-cyan-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsHasGpsTracker}
                      onChange={(e) => setDocsHasGpsTracker(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Трекер установлен</span>
                  </label>
                </div>

                {docsHasGpsTracker && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-500/20 items-center">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">Абонентская плата (₾/мес):</label>
                      <input
                        type="number"
                        value={docsGpsMonthlyFee}
                        onChange={(e) => setDocsGpsMonthlyFee(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div className="pt-3">
                      <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={docsIsGpsFeeChargedToOwner}
                          onChange={(e) => setDocsIsGpsFeeChargedToOwner(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span>Списывать с владельца авто</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDocsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-xl shadow transition"
                >
                  {isSubmitting ? "Сохранение..." : "Обновить документы"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
