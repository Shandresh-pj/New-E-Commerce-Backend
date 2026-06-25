export function getDiff(oldData: any, newData: any) {
  const diff: any = {};

  if (!oldData) return newData;

  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      diff[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  }

  return diff;
}