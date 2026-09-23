import { useSelector } from 'react-redux';

// Read user's DB-driven permissions from Redux to eliminate hardcoded role checks across UI components
export const usePermission = (moduleName, actionName) => {
  const permissions = useSelector((state) => state.auth?.user?.permissions);

  if (!Array.isArray(permissions)) {
    return false;
  }

  // Verify whether the user's role grants this exact module and action capability
  return permissions.some(
    (p) => p.module === moduleName && p.action === actionName
  );
};

export default usePermission;
