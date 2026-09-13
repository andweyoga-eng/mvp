import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, UserCheck, Users, UserX } from "lucide-react";

export interface AdminInsightsStats {
  totalUsers: number;
  completeProfiles: number;
  incompleteProfiles: number;
  upcomingSessions: number;
}

export function AdminDataInsightsPanel({ stats }: { stats: AdminInsightsStats }) {
  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-[#3d1b80]" },
    {
      label: "Complete Profiles",
      value: stats.completeProfiles,
      icon: UserCheck,
      color: "text-green-600",
    },
    {
      label: "Incomplete Profiles",
      value: stats.incompleteProfiles,
      icon: UserX,
      color: "text-orange-500",
    },
    {
      label: "Upcoming Sessions",
      value: stats.upcomingSessions,
      icon: Calendar,
      color: "text-[#bb5309]",
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#3d1b80]" />
          Data and Insights
        </CardTitle>
        <CardDescription>
          Snapshot of members and scheduling, refreshed when you open this tab or reload the
          dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
