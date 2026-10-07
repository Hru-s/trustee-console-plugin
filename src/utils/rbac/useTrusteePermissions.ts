import { useAccessReview } from '@openshift-console/dynamic-plugin-sdk';
import { TRUSTEE_NAMESPACE } from '../../k8s/resources';

export const useTrusteePermissions = () => {
  const [canCreateTrusteeConfig, loadingTc] = useAccessReview({
    group: 'confidentialcontainers.org',
    resource: 'trusteeconfigs',
    verb: 'create',
  });

  return {
    canCreateTrusteeConfig,
    isLoading: loadingTc,
  };
};

export const useCanPatchConfigMap = (name?: string, namespace?: string) => {
  const [allowed, loading] = useAccessReview({
    group: '',
    resource: 'configmaps',
    namespace: namespace || TRUSTEE_NAMESPACE,
    name,
    verb: 'patch',
  });
  return { allowed, loading };
};

export const useCanCreateSecret = (namespace?: string) => {
  const [allowed, loading] = useAccessReview({
    group: '',
    resource: 'secrets',
    namespace: namespace || TRUSTEE_NAMESPACE,
    verb: 'create',
  });
  return { allowed, loading };
};

export const useCanCreateJob = (namespace?: string) => {
  const [allowed, loading] = useAccessReview({
    group: 'batch',
    resource: 'jobs',
    namespace: namespace || TRUSTEE_NAMESPACE,
    verb: 'create',
  });
  return { allowed, loading };
};
