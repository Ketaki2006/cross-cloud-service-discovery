import React, { useState } from 'react';
import { registerService } from '../services/api';
import { useToast } from './Toast';

interface RegisterServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterServiceModal: React.FC<RegisterServiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [provider, setProvider] = useState('AZURE');
  const [ip, setIp] = useState('10.8.0.2');
  const [port, setPort] = useState('8001');
  const [healthPath, setHealthPath] = useState('/health');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registerService({
        name: name.trim(),
        id: id.trim(),
        provider: provider.toUpperCase(),
        address: ip.trim(),
        port: Number(port),
        checkPath: healthPath.startsWith('/') ? healthPath.trim() : '/' + healthPath.trim(),
        interval: '10s',
        timeout: '3s',
        tags: [provider.toUpperCase()],
      });

      showToast(`Service "${name}" (${id}) registered with Consul successfully!`, 'success');
      onSuccess();
      onClose();
      setName('');
      setId('');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">add_circle</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Register New Cloud Service</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-body-sm text-body-sm text-secondary mb-space-md">
          This dispatches a payload to <code className="font-code-sm text-code-sm text-primary">POST /api/services/register</code> and registers the service with the local Consul agent catalog.
        </p>

        <form className="flex flex-col gap-space-sm" onSubmit={handleSubmit}>
          <div>
            <label className="block font-label-md text-label-md text-on-surface font-medium mb-1">Service Name</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              placeholder="e.g. auth-service"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-space-sm">
            <div>
              <label className="block font-label-md text-label-md text-on-surface font-medium mb-1">Service ID</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-code-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                placeholder="e.g. auth-01"
                required
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface font-medium mb-1">Cloud Provider</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="AWS">Amazon Web Services (AWS)</option>
                <option value="AZURE">Microsoft Azure (AZURE)</option>
                <option value="GCP">Google Cloud Platform (GCP)</option>
                <option value="LOCAL">Local Host</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm">
            <div>
              <label className="block font-label-md text-label-md text-on-surface font-medium mb-1">IP Address</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-code-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                placeholder="10.8.0.2"
                required
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface font-medium mb-1">Port</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-code-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                placeholder="8001"
                required
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface font-medium mb-1">Health Check Endpoint</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-code-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              placeholder="/health"
              type="text"
              value={healthPath}
              onChange={(e) => setHealthPath(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-space-sm mt-space-md pt-space-xs">
            <button
              className="px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-lg text-label-lg font-medium transition-colors"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-label-lg text-label-lg font-medium transition-colors shadow-sm disabled:opacity-50"
              type="submit"
            >
              {loading ? 'Registering...' : 'Register Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

