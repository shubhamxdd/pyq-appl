import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { resourcesApi } from '../api/resources';
import { papersApi } from '../api/papers';
import {
  FileEdit,
  Plus,
  Loader2,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Brain,
  Download,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'react-hot-toast';

export default function Generator() {
  const queryClient = useQueryClient();
  const { paperId } = useParams();
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedResources, setSelectedResources] = useState<{id: string, role: string}[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [formatConfig, setFormatConfig] = useState<any>({
    mcq: 0,
    short: 0,
    long: 0,
    mcq_marks: 1,
    short_marks: 5,
    long_marks: 10
  });
  const [activePaperId, setActivePaperId] = useState<string | null>(paperId || null);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [newPaperTitle, setNewPaperTitle] = useState('');

  // Sync state with URL
  useEffect(() => {
    if (paperId) {
      setActivePaperId(paperId);
    } else {
      setActivePaperId(null);
    }
  }, [paperId]);

  // Handle paper selection
  const handleSelectPaper = (id: string) => {
    if (id !== activePaperId) {
      navigate(`/generator/${id}`);
    }
  };

  // --- QUERIES ---
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },
  });

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
  });

  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['papers'],
    queryFn: papersApi.list,
    refetchInterval: (query) => {
        return query.state.data?.some((p: any) => p.status === 'pending' || p.status === 'generating') ? 3000 : false;
    }
  });

  const activePaper = papers?.find((p: any) => p.id === activePaperId);

  const { data: activeOutput, isLoading: outputLoading } = useQuery({
    queryKey: ['paper-output', activePaperId],
    queryFn: () => activePaperId ? papersApi.getOutput(activePaperId) : Promise.resolve(null),
    enabled: !!activePaperId && activePaper?.status === 'done',
  });

  const readyResources = resources?.filter(r => r.status === 'ready') || [];

  const isPatternEmpty = (formatConfig?.mcq || 0) + (formatConfig?.short || 0) + (formatConfig?.long || 0) === 0;

  // --- MUTATIONS ---
  const detectFormatMutation = useMutation({
    mutationFn: (resourceId: string) => papersApi.detectFormat(resourceId),
    onSuccess: (data) => {
      setFormatConfig(data);
      toast.success('Format detected successfully!');
    },
    onSettled: () => setIsDetecting(false),
  });

  const createPaperMutation = useMutation({
    mutationFn: (data: any) => papersApi.create(data),
    onSuccess: (newPaper) => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      setIsCreateOpen(false);
      setTitle('');
      setSelectedResources([]);
      setFormatConfig(null);
      navigate(`/generator/${newPaper.id}`);
      toast.success('Paper generation started!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create paper.');
    }
  });

  const toggleSettingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => papersApi.toggleOutput(id, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['paper-output', activePaperId] });
    }
  });

  const exportPdfMutation = useMutation({
    mutationFn: ({ id, mode }: { id: string, mode?: string }) => papersApi.getPdf(id, mode),
    onSuccess: (data) => {
        if (data.url) {
            window.open(data.url, '_blank');
            toast.success('PDF generated successfully!');
        }
    },
    onError: () => {
        toast.error('Failed to generate PDF. Please try again.');
    }
  });

  const renamePaperMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => papersApi.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      setEditingPaperId(null);
      toast.success('Paper renamed successfully');
    },
    onError: () => {
      toast.error('Failed to rename paper.');
    }
  });

  const deletePaperMutation = useMutation({
    mutationFn: (id: string) => papersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      setActivePaperId(null);
      navigate('/generator');
      toast.success('Paper deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete paper.');
    }
  });

  const startRenamingPaper = (id: string, currentTitle: string) => {
    setEditingPaperId(id);
    setNewPaperTitle(currentTitle);
  };

  const handleRenamePaper = (id: string) => {
    if (!newPaperTitle.trim()) return;
    renamePaperMutation.mutate({ id, title: newPaperTitle });
  };

  // --- HANDLERS ---
  const handleResourceToggle = (id: string) => {
    setSelectedResources(prev => {
      const exists = prev.find(r => r.id === id);
      if (exists) return prev.filter(r => r.id !== id);
      return [...prev, { id, role: 'notes' }];
    });
  };

  const handleRoleChange = (id: string, role: string) => {
    setSelectedResources(prev => prev.map(r => r.id === id ? { ...r, role } : r));
  };

  const handleDetectFormat = (id: string) => {
    setIsDetecting(true);
    detectFormatMutation.mutate(id);
  };

  const handleCreatePaper = () => {
    if (!title || selectedResources.length === 0 || isPatternEmpty) {
      toast.error('Please fill in all fields and ensure the pattern is not empty.');
      return;
    }

    // --- QUOTA CHECK ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPapers = papers?.filter((p: any) => new Date(p.created_at) >= startOfMonth) || [];
    
    if (user?.plan === 'free' && monthlyPapers.length >= 3) {
      toast.error('limit exceed, upgrade to continue');
      return;
    }

    createPaperMutation.mutate({
      title,
      resources: selectedResources.map(r => ({ resource_id: r.id, role: r.role })),
      format_config: formatConfig,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <FileEdit className="size-9 text-primary" />
            Paper Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate custom exam papers from your study materials.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg hover:shadow-primary/20 transition-all gap-2">
              <Plus className="size-5" />
              Generate New Paper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-2 border-b shrink-0">
              <DialogTitle className="text-2xl font-bold">New Sample Paper</DialogTitle>
              <DialogDescription>
                Select your materials and define the exam pattern.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-6 min-h-0 py-2">
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold">Paper Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., Biology Midterm Prep 2024" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Step 1: Select Materials</Label>
                    <Badge variant="secondary">{selectedResources.length} Selected</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {readyResources.map(res => (
                      <div 
                        key={res.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          selectedResources.find(r => r.id === res.id) 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id={`res-${res.id}`} 
                            checked={!!selectedResources.find(r => r.id === res.id)}
                            onCheckedChange={() => handleResourceToggle(res.id)}
                          />
                          <div className="grid gap-0.5">
                            <Label htmlFor={`res-${res.id}`} className="font-medium cursor-pointer">
                              {res.filename}
                            </Label>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                              {res.type}
                            </span>
                          </div>
                        </div>

                        {selectedResources.find(r => r.id === res.id) && (
                          <div className="flex items-center gap-2">
                            <select 
                              className="text-xs bg-transparent border-none focus:ring-0 font-semibold text-primary cursor-pointer"
                              value={selectedResources.find(r => r.id === res.id)?.role}
                              onChange={(e) => handleRoleChange(res.id, e.target.value)}
                            >
                              <option value="notes">Notes</option>
                              <option value="syllabus">Syllabus</option>
                              <option value="past_paper">Past Paper</option>
                            </select>
                            {res.type === 'past_paper' && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-[10px] gap-1 px-2"
                                    onClick={() => handleDetectFormat(res.id)}
                                    disabled={isDetecting}
                                >
                                    {isDetecting ? <Loader2 className="size-3 animate-spin" /> : <Brain className="size-3" />}
                                    Detect Pattern
                                </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {readyResources.length === 0 && (
                        <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed">
                            <p className="text-sm text-muted-foreground">No ready resources found. Upload some first.</p>
                        </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Step 2: Exam Pattern</Label>
                    <div className="flex gap-2">
                       {isDetecting && <Badge variant="secondary" className="animate-pulse">Analyzing...</Badge>}
                       <Badge variant="outline" className="text-[10px] uppercase font-bold opacity-60">Editable</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mcq-count" className="text-[10px] uppercase font-bold text-muted-foreground">MCQs</Label>
                      <div className="relative">
                        <Input 
                          id="mcq-count"
                          type="number" 
                          min="0"
                          value={formatConfig?.mcq || 0}
                          onChange={(e) => setFormatConfig({...formatConfig, mcq: parseInt(e.target.value) || 0})}
                          className="pl-8 font-bold"
                        />
                        <Zap className="absolute left-2.5 top-2.5 size-4 text-yellow-500 opacity-50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="short-count" className="text-[10px] uppercase font-bold text-muted-foreground">Short Qs</Label>
                      <div className="relative">
                        <Input 
                          id="short-count"
                          type="number" 
                          min="0"
                          value={formatConfig?.short || 0}
                          onChange={(e) => setFormatConfig({...formatConfig, short: parseInt(e.target.value) || 0})}
                          className="pl-8 font-bold"
                        />
                        <FileText className="absolute left-2.5 top-2.5 size-4 text-blue-500 opacity-50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="long-count" className="text-[10px] uppercase font-bold text-muted-foreground">Long Qs</Label>
                      <div className="relative">
                        <Input 
                          id="long-count"
                          type="number" 
                          min="0"
                          value={formatConfig?.long || 0}
                          onChange={(e) => setFormatConfig({...formatConfig, long: parseInt(e.target.value) || 0})}
                          className="pl-8 font-bold"
                        />
                        <BookOpen className="absolute left-2.5 top-2.5 size-4 text-purple-500 opacity-50" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg border border-dashed flex items-center gap-3">
                    <Settings2 className="size-4 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      To auto-fill this, select a "Past Paper" in Step 1 and click <strong>Detect Pattern</strong>. 
                      You can also manually enter the numbers above.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-2 border-t bg-muted/20 shrink-0">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreatePaper} 
                disabled={!title || selectedResources.length === 0 || isPatternEmpty || createPaperMutation.isPending}
                className="gap-2"
              >
                {createPaperMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4" />}
                Generate Paper
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Paper List Sidebar */}
        <div className="lg:col-span-4 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground px-2">Recent Generations</h3>
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-3">
                    {papersLoading && <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
                    {papers?.map((paper: any) => (
                        <Card 
                            key={paper.id} 
                            className={cn(
                                "cursor-pointer transition-all hover:border-primary/50 group",
                                activePaperId === paper.id ? "border-primary bg-primary/5" : "border-border/50"
                            )}
                            onClick={() => handleSelectPaper(paper.id)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={cn(
                                        "size-10 rounded-xl flex items-center justify-center shrink-0",
                                        paper.status === 'done' ? "bg-green-500/10 text-green-600" :
                                        paper.status === 'failed' ? "bg-destructive/10 text-destructive" :
                                        "bg-primary/10 text-primary animate-pulse"
                                    )}>
                                        {paper.status === 'done' ? <CheckCircle2 className="size-5" /> : 
                                         paper.status === 'failed' ? <XCircle className="size-5" /> : 
                                         <Clock className="size-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {editingPaperId === paper.id ? (
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Input 
                                                    className="h-7 text-xs py-0 px-2"
                                                    value={newPaperTitle}
                                                    onChange={(e) => setNewPaperTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenamePaper(paper.id);
                                                        if (e.key === 'Escape') setEditingPaperId(null);
                                                    }}
                                                    autoFocus
                                                />
                                                <Button size="icon" variant="ghost" className="size-6 shrink-0" onClick={() => handleRenamePaper(paper.id)}>
                                                    <Check className="size-3 text-green-600" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <h4 className="font-bold text-sm truncate">{paper.title}</h4>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                                                    {new Date(paper.created_at).toLocaleDateString()}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {editingPaperId !== paper.id && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="size-7 text-muted-foreground hover:text-primary"
                                            onClick={() => startRenamingPaper(paper.id, paper.title)}
                                        >
                                            <Edit2 className="size-3" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="size-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => { 
                                                if(window.confirm('Delete this paper?')) deletePaperMutation.mutate(paper.id); 
                                            }}
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                )}
                                <ChevronRight className={cn("size-4 text-muted-foreground transition-opacity", editingPaperId === paper.id ? "opacity-0" : "opacity-0 group-hover:opacity-100")} />
                            </CardContent>
                        </Card>
                    ))}
                    {!papersLoading && papers?.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10">
                            <p className="text-sm text-muted-foreground">No papers generated yet.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Paper Content Area */}
        <div className="lg:col-span-8">
            {activePaperId ? (
                <div className="space-y-6">
                    {/* Header Card */}
                    {papers?.find((p: any) => p.id === activePaperId) && (
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/20 pb-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold">{papers.find((p: any) => p.id === activePaperId).title}</CardTitle>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                                {papers.find((p: any) => p.id === activePaperId).status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => {
                                            if(window.confirm('Delete this paper? This will also abort generation if running.')) {
                                                deletePaperMutation.mutate(activePaperId);
                                            }
                                        }}
                                        disabled={deletePaperMutation.isPending}
                                        title={activePaper?.status === 'generating' ? "Abort Generation" : "Delete Paper"}
                                    >
                                        {deletePaperMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                    </Button>

                                    {/* Full Version (Study Guide) */}
                                    {activeOutput?.pdf_url ? (
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="gap-2 h-9 shadow-sm bg-green-500/5 hover:bg-green-500/10 text-green-600 border-green-500/20" 
                                                onClick={() => window.open(activeOutput.pdf_url, '_blank')}
                                            >
                                                <Download className="size-4" />
                                                Study Guide
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                                                onClick={() => exportPdfMutation.mutate({ id: activePaperId!, mode: 'full' })}
                                                disabled={exportPdfMutation.isPending}
                                                title="Re-generate Study Guide"
                                            >
                                                {exportPdfMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Settings2 className="size-3" />}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="gap-2 h-9 shadow-sm" 
                                            onClick={() => activePaperId && exportPdfMutation.mutate({ id: activePaperId, mode: 'full' })}
                                            disabled={exportPdfMutation.isPending || activePaper?.status !== 'done'}
                                        >
                                            {exportPdfMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                                            Export Study Guide
                                        </Button>
                                    )}

                                    {/* Questions Only Version */}
                                    {activeOutput?.question_pdf_url ? (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="gap-2 h-9 shadow-sm bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 border-blue-500/20" 
                                            onClick={() => window.open(activeOutput.question_pdf_url, '_blank')}
                                        >
                                            <FileText className="size-4" />
                                            Question Paper
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="gap-2 h-9 shadow-sm" 
                                            onClick={() => activePaperId && exportPdfMutation.mutate({ id: activePaperId, mode: 'questions_only' })}
                                            disabled={exportPdfMutation.isPending || activePaper?.status !== 'done'}
                                        >
                                            {exportPdfMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                                            Export Questions
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="ans-toggle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Answers</Label>
                                        <Button 
                                            id="ans-toggle"
                                            size="sm" 
                                            variant={activeOutput?.include_answers ? "default" : "outline"} 
                                            className="h-8 px-2 gap-1.5"
                                            onClick={() => toggleSettingsMutation.mutate({
                                                id: activePaperId,
                                                data: { include_answers: !activeOutput?.include_answers }
                                            })}
                                        >
                                            {activeOutput?.include_answers ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                            {activeOutput?.include_answers ? "Visible" : "Hidden"}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="exp-toggle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Explanations</Label>
                                        <Button 
                                            id="exp-toggle"
                                            size="sm" 
                                            variant={activeOutput?.include_explanations ? "default" : "outline"} 
                                            className="h-8 px-2 gap-1.5"
                                            onClick={() => toggleSettingsMutation.mutate({
                                                id: activePaperId,
                                                data: { include_explanations: !activeOutput?.include_explanations }
                                            })}
                                        >
                                            {activeOutput?.include_explanations ? <Brain className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                            {activeOutput?.include_explanations ? "Visible" : "Hidden"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Question List */}
                    <div className="space-y-4">
                        {outputLoading && (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <Loader2 className="size-10 animate-spin text-primary" />
                                <p className="text-muted-foreground font-medium animate-pulse">Retrieving your custom paper...</p>
                            </div>
                        )}

                        {!outputLoading && activeOutput?.questions?.map((q: any, idx: number) => (
                            <Card key={idx} className="border-border/50 shadow-sm hover:border-primary/30 transition-colors group">
                                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                                                QUESTION {idx + 1}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                                {q.type} • {q.marks} MARKS
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg leading-relaxed pt-2">{q.question_text}</CardTitle>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Badge className="bg-muted text-muted-foreground hover:bg-muted border-none font-bold text-[10px]">
                                            {q.topic}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {q.type === 'mcq' && q.options && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                            {q.options.map((opt: string, i: number) => (
                                                <div 
                                                    key={i} 
                                                    className={cn(
                                                        "p-3 rounded-lg border text-sm transition-all",
                                                        activeOutput.include_answers && opt === q.answer 
                                                            ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400 font-bold" 
                                                            : "bg-muted/30 border-border/50"
                                                    )}
                                                >
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeOutput.include_answers && q.type !== 'mcq' && (
                                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="size-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Model Answer</span>
                                            </div>
                                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                                {q.answer}
                                            </p>
                                        </div>
                                    )}

                                    {activeOutput.include_explanations && q.explanation && (
                                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Brain className="size-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">AI Explanation</span>
                                            </div>
                                            <p className="text-sm text-foreground/90 leading-relaxed italic">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {!outputLoading && !activeOutput && activePaper?.status !== 'failed' && (
                             <div className="flex flex-col items-center justify-center p-20 gap-4 border-2 border-dashed rounded-3xl bg-muted/5">
                                <div className="size-16 bg-muted rounded-full flex items-center justify-center">
                                    <Clock className="size-8 text-muted-foreground/50" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold">Paper is Generating</h3>
                                    <p className="text-sm text-muted-foreground">Our AI is crafting your exam based on your materials. This usually takes 30-60 seconds.</p>
                                </div>
                            </div>
                        )}

                        {!outputLoading && !activeOutput && activePaper?.status === 'failed' && (
                             <div className="flex flex-col items-center justify-center p-20 gap-4 border-2 border-dashed rounded-3xl bg-destructive/5">
                                <div className="size-16 bg-destructive/10 rounded-full flex items-center justify-center">
                                    <AlertCircle className="size-8 text-destructive" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-destructive">Generation Failed</h3>
                                    <p className="text-sm text-muted-foreground">Something went wrong while generating this paper. Please check the worker logs and try again.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] border-2 border-dashed rounded-3xl bg-muted/5 p-10 text-center space-y-6">
                    <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center shadow-inner">
                        <FileEdit className="size-10 text-primary" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h2 className="text-2xl font-bold">Ready to Practice?</h2>
                        <p className="text-muted-foreground">Select a generated paper from the sidebar or click the button above to create a brand new one from your materials.</p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="rounded-full px-8 border-primary/30 hover:bg-primary/5 hover:border-primary transition-all"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        Start Your First Generation
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
