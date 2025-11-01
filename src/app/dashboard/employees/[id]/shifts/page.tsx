"use client";
import { useParams } from "next/navigation";
import Shifts from "../../../../dashboard/shifts/page";

export default function EmployeeShiftsPage() {
  // Reuse global shifts page; user can paste employeeId
  const params = useParams();
  return (
    <div>
      <p className="text-sm text-gray-600 mb-2">Employee ID: <span className="font-mono">{params?.id}</span></p>
      <Shifts />
    </div>
  );
}


