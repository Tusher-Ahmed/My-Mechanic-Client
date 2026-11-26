import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";

/** Load an admin list endpoint; returns rows + helpers to update them locally. */
export function useList(path) {
  const [rows, setRows] = useState(null);
  const reload = useCallback(
    () =>
      api
        .get(path)
        .then(({ data }) => setRows(data))
        .catch((err) => {
          toast.error(errorMessage(err));
          setRows((r) => r ?? []);
        }),
    [path]
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const upsert = (doc) => setRows((list) => (list?.some((r) => r._id === doc._id) ? list.map((r) => (r._id === doc._id ? doc : r)) : [doc, ...(list ?? [])]));
  const remove = (id) => setRows((list) => list?.filter((r) => r._id !== id));
  return { rows, setRows, reload, upsert, remove };
}
