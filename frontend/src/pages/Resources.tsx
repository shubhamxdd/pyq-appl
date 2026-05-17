import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { resourcesApi, type Resource } from '../api/resources';
import { FileText, Trash2, Upload, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

export default function Resources() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('notes');
  const [isUploading, setIsUploading] = useState(false);

  const { data: resources, isLoading, isError } = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
    refetchInterval: (query) => {
      // Poll if any resource is still processing
      return query.state.data?.some(r => r.status === 'processing') ? 3000 : false;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) => resourcesApi.upload(file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setFile(null);
      toast.success('File uploaded successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to upload file.';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: resourcesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
    },
    onError: () => {
      toast.error('Failed to delete resource');
    },
  });

  const retryMutation = useMutation({
    mutationFn: resourcesApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Processing restarted');
    },
    onError: () => {
      toast.error('Failed to restart processing');
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, type });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          Study Resources
        </h1>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Upload New Resource</h2>
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File (PDF or TXT)</label>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
            >
              <option value="notes">Notes</option>
              <option value="syllabus">Syllabus</option>
              <option value="past_paper">Past Paper</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!file || isUploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </form>
      </div>

      {/* Resource List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-red-500 dark:text-red-400">
                  <XCircle className="w-8 h-8 mx-auto mb-2" />
                  Failed to load resources. Please try refreshing.
                </td>
              </tr>
            ) : !resources || resources.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  No resources uploaded yet.
                </td>
              </tr>
            ) : (
              resources.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{res.filename}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{res.type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(res.status)}
                      <span className={clsx(
                        "text-xs font-semibold",
                        res.status === 'ready' ? "text-green-600" : res.status === 'failed' ? "text-red-600" : "text-blue-600"
                      )}>
                        {res.status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(res.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {res.status === 'failed' && (
                        <button
                          onClick={() => retryMutation.mutate(res.id)}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 p-2"
                          title="Retry Processing"
                        >
                          <RefreshCw className={clsx("w-5 h-5", retryMutation.isPending && "animate-spin")} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(res.id)}
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400 p-2"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
