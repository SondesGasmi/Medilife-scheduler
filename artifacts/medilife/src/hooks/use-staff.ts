import { useQueryClient } from "@tanstack/react-query";
import {
  getGetStaffSummaryQueryKey,
  getListStaffQueryKey,
  useCreateStaff,
  useDeleteStaff,
  useGetStaffSummary,
  useListStaff,
  useUpdateStaff,
} from "@workspace/api-client-react";

export function useStaffWorkspace() {
  const queryClient = useQueryClient();
  const staffQuery = useListStaff();
  const summaryQuery = useGetStaffSummary();

  const refreshStaff = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetStaffSummaryQueryKey() }),
  ]);

  const createStaff = useCreateStaff({
    mutation: {
      onSuccess: refreshStaff,
    },
  });
  const updateStaff = useUpdateStaff({
    mutation: {
      onSuccess: refreshStaff,
    },
  });
  const deleteStaff = useDeleteStaff({
    mutation: {
      onSuccess: refreshStaff,
    },
  });

  return { staffQuery, summaryQuery, createStaff, updateStaff, deleteStaff };
}