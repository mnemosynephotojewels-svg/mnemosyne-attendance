import React from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { employees } from '../../data/mockData';
import { Mail, Phone } from 'lucide-react';

export function EmployeeList() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1F2937] mb-8">Employee Directory</h1>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-semibold text-sm">
                        {employee.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <p className="font-medium text-[#1F2937]">{employee.name}</p>
                        <p className="text-xs text-[#6B7280]">{employee.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F2937]">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F2937]">
                    {employee.team}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Mail className="w-3 h-3" />
                        <span>{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Phone className="w-3 h-3" />
                        <span>{employee.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={employee.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
