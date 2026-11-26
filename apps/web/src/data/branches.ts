import type { BranchRecord } from "@/types/prototype";

export const BRANCHES: BranchRecord[] = [
  {
    id: "branch-ws01",
    code: "WS01",
    name: "Davao Main",
    city: "Davao City",
    address: "128 R. Magsaysay Avenue, Davao City",
    phone: "(082) 224-1180",
    type: "FLAGSHIP",
    openedAt: "2014-03-08",
  },
  {
    id: "branch-ws02",
    code: "WS02",
    name: "Bajada",
    city: "Davao City",
    address: "44 J.P. Laurel Avenue, Bajada, Davao City",
    phone: "(082) 226-7742",
    type: "BRANCH",
    openedAt: "2017-08-19",
  },
  {
    id: "branch-ws03",
    code: "WS03",
    name: "Lanang",
    city: "Davao City",
    address: "Unit 3, Lanang Business Park, Davao City",
    phone: "(082) 235-9014",
    type: "BRANCH",
    openedAt: "2019-11-05",
  },
  {
    id: "branch-ws04",
    code: "WS04",
    name: "Tagum",
    city: "Tagum City",
    address: "17 Pioneer Avenue, Tagum City",
    phone: "(084) 218-3320",
    type: "BRANCH",
    openedAt: "2020-06-12",
  },
  {
    id: "branch-ws05",
    code: "WS05",
    name: "General Santos",
    city: "General Santos City",
    address: "88 Santiago Boulevard, General Santos City",
    phone: "(083) 552-6618",
    type: "BRANCH",
    openedAt: "2021-02-26",
  },
  {
    id: "branch-ws06",
    code: "WS06",
    name: "Digos",
    city: "Digos City",
    address: "12 Rizal Avenue, Digos City",
    phone: "(082) 553-7745",
    type: "BRANCH",
    openedAt: "2022-07-30",
  },
  {
    id: "branch-ws07",
    code: "WS07",
    name: "Mati",
    city: "Mati City",
    address: "5 Quezon Street, Mati City",
    phone: "(087) 388-1207",
    type: "BRANCH",
    openedAt: "2023-04-15",
  },
  {
    id: "branch-ws08",
    code: "WS08",
    name: "Panabo",
    city: "Panabo City",
    address: "31 Quezon Street, Panabo City",
    phone: "(084) 628-5521",
    type: "BRANCH",
    openedAt: "2023-10-21",
  },
];

export const BRANCH_BY_ID = new Map(BRANCHES.map((branch) => [branch.id, branch]));

export function branchLabel(branchId: string): string {
  const branch = BRANCH_BY_ID.get(branchId);
  return branch ? `${branch.code} · ${branch.name}` : "Unassigned branch";
}
