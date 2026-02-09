"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Shield,
  CheckCircle,
  BarChart3,
  Eye,
  Edit,
  Save,
  Loader2,
  Upload as UploadIcon,
  Calendar as CalendarIcon,
  FileSignature,
  FileInput,
  Send,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHomeCMS } from "@/hooks/use-home.cms";
import { useQuickAccess } from "@/hooks/useQuickAccess";
import TiptapEditor from "@/components/tiptap-editor";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const Homepage = () => {
  const { user } = useAuth();
  const { cmsData, loading: cmsLoading, saving, saveCMS } = useHomeCMS();
  const { data: quickAccessData, isLoading: quickAccessLoading } = useQuickAccess();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("preview");
  const [formData, setFormData] = useState({
    logo_url: "",
    video_url: "",
    vision: "",
    mission: "",
    welcome_title: "",
    welcome_text: "",
  });
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Check if user is superadmin
  const isSuperAdmin = user?.roles?.some(
    (role: any) => role.code === "SUPER_ADMIN",
  );

  // Debug logging
  useEffect(() => {
    console.log("User data:", user);
    console.log("Is Super Admin:", isSuperAdmin);
    console.log("User roles:", user?.roles);
  }, [user, isSuperAdmin]);

  // Update form data when CMS data is loaded
  useEffect(() => {
    if (cmsData) {
      setFormData({
        logo_url: cmsData.logo_url || "",
        video_url: cmsData.video_url || "",
        vision: cmsData.vision || "",
        mission: cmsData.mission || "",
        welcome_title: cmsData.welcome_title || "",
        welcome_text: cmsData.welcome_text || "",
      });
      setLogoPreview(cmsData.logo_url || null);
    }
  }, [cmsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await saveCMS(formData);
    if (result.success) {
      toast.success("Home page content updated successfully!");
      setActiveTab("preview");
    } else {
      toast.error(result.message || "Failed to update content");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditorChange = (field: "vision" | "mission", content: string) => {
    setFormData({
      ...formData,
      [field]: content,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          logo_url: result.url,
        }));
        toast.success("Logo uploaded successfully!");
      } else {
        toast.error(result.message || "Upload failed");
        setLogoPreview(null);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
      setLogoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video size must be less than 50MB");
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "video");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          video_url: result.url,
        }));
        toast.success("Video uploaded successfully!");
      } else {
        toast.error(result.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  // Preview Content Component
  const PreviewContent = ({ data }: { data: typeof cmsData }) => {
    if (cmsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading home page content...</p>
          </div>
        </div>
      );
    }

    return (
    <div className="space-y-4 p-4">
      {/* Quick Access Section */}
      {!quickAccessLoading && quickAccessData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {/* Pending Signatures */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
            onClick={() => router.push("/workflows/pending-signatures")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Pending Signatures</p>
                  <p className="text-xl font-bold text-primary">
                    {quickAccessData.pendingSignatures}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FileSignature className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Incoming Documents */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-blue-500/50"
            onClick={() => router.push("/documents/in-transit")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Incoming Documents</p>
                  <p className="text-xl font-bold text-blue-600">
                    {quickAccessData.incomingDocuments}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <FileInput className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-blue-600 transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-orange-500/50"
            onClick={() => router.push("reports/document-trailing")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Recent Activity</p>
                  <p className="text-xl font-bold text-orange-600">
                    {quickAccessData.recentActivity}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-orange-600 transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-orange-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Completed (Department) */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-green-500/50"
            onClick={() => router.push("/documents?filter=completed-dept")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Completed (Dept)</p>
                  <p className="text-xl font-bold text-green-600">
                    {quickAccessData.completedSharedToDepartment}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-green-600 transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-green-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Completed (User) */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500/50"
            onClick={() => router.push("/documents?filter=completed-user")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Completed (User)</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {quickAccessData.completedSharedToUser}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-emerald-600 transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Shared to Department */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-purple-500/50"
            onClick={() => router.push("/documents/shared?tab=completed")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Shared to Department</p>
                  <p className="text-xl font-bold text-purple-600">
                    {quickAccessData.completedSharedToDepartment}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-purple-600 transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Shared to User */}
          <Card 
            className="shadow-sm border hover:shadow-md transition-all cursor-pointer group hover:border-indigo-500/50"
            onClick={() => router.push("/documents/shared?tab=completed")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0">
                  <p className="text-xs text-muted-foreground">Shared to User Only</p>
                  <p className="text-xl font-bold text-indigo-600">
                    {quickAccessData.sharedToUser}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <Eye className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground group-hover:text-indigo-600 transition-colors">Click to proceed</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Company Logo & Welcome Section with Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full ">
        {/* Combined Logo & Welcome Column */}
        <div className="w-full col-span-2 flex items-center justify-center shadow-md rounded-lg">
          <div className=" flex flex-col items-center justify-center  md:flex-row md:items-center md:justify-start gap-4 animate-in fade-in duration-700">
            {/* Logo */}
            <div className="flex-shrink-0">
              {data?.logo_url ? (
                <div className="w-24 h-24 md:w-32 md:h-32 relative hover:scale-105 transition-transform duration-300">
                  <Image
                    src={data.logo_url}
                    alt="Organization Logo"
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </div>
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl flex items-center justify-center shadow-xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105">
                  <FileText className="h-12 w-12 md:h-16 md:w-16 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Welcome Content */}
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-primary/70 bg-clip-text text-transparent drop-shadow-sm">
                {data?.welcome_title || "Document Management System"}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground/90 text-justify px-4 md:px-0 md:max-w-xl">
                {data?.welcome_text ||
                  "Welcome to our organization's document management platform"}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs hover:bg-green-100 transition-colors"
                >
                  <CheckCircle className="h-2.5 w-2.5 mr-1" />
                  System Online
                </Badge>
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 text-xs hover:bg-accent transition-colors"
                >
                  Version 1.0.0
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Column */}
        <div className="w-full">
          <Card className="shadow-md h-full border hover:shadow-lg transition-shadow animate-in py-0 fade-in-50 duration-700 delay-150">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b py-3">
              <CardTitle className="py-2 text-base font-semibold flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Month Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </Badge>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <div
                      key={i}
                      className="text-xs font-medium text-muted-foreground py-1"
                    >
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const today = new Date();
                    const firstDay = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      1,
                    ).getDay();
                    const daysInMonth = new Date(
                      today.getFullYear(),
                      today.getMonth() + 1,
                      0,
                    ).getDate();
                    const dayNumber = i - firstDay + 1;
                    const isCurrentMonth =
                      dayNumber > 0 && dayNumber <= daysInMonth;
                    const isToday =
                      isCurrentMonth && dayNumber === today.getDate();

                    return (
                      <div
                        key={i}
                        className={`text-xs py-1.5 rounded-md ${
                          isToday
                            ? "bg-primary text-primary-foreground font-bold"
                            : isCurrentMonth
                              ? "hover:bg-accent cursor-pointer"
                              : "text-muted-foreground/30"
                        }`}
                      >
                        {isCurrentMonth ? dayNumber : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid: Video with Vision/Mission beside it */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Video Section */}
        <div className="lg:col-span-2">
          {data?.video_url ? (
            <Card className="py-0 shadow-md border overflow-hidden hover:shadow-lg transition-all animate-in fade-in-50 duration-700 delay-100">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b py-3">
                <CardTitle className="py-2 text-base font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  Introduction Video
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-black to-gray-900">
                  {data.video_url.includes("youtube.com") ||
                  data.video_url.includes("youtu.be") ? (
                    <iframe
                      src={(() => {
                        let videoId = "";
                        if (data.video_url.includes("watch?v=")) {
                          videoId = data.video_url.split("watch?v=")[1].split("&")[0];
                        } else if (data.video_url.includes("youtu.be/")) {
                          videoId = data.video_url.split("youtu.be/")[1].split("?")[0];
                        } else if (data.video_url.includes("embed/")) {
                          videoId = data.video_url.split("embed/")[1].split("?")[0];
                        }
                        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&enablejsapi=1&rel=0`;
                      })()}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video
                      src={data.video_url}
                      controls
                      autoPlay
                      muted
                      loop
                      className="w-full h-full"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-2 border-dashed border-muted/30 animate-in fade-in-50 duration-700 delay-100">
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-muted/20 rounded-lg flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground/70">
                      Video Coming Soon
                    </h3>
                    <p className="text-xs text-muted-foreground/50">
                      An introduction video will be available shortly
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Vision & Mission Column */}
        <div className="space-y-4">
          {/* Vision */}
          {data?.vision ? (
            <Card className="py-0 shadow-md border hover:shadow-lg transition-all group hover:-translate-y-0.5 animate-in fade-in-50 duration-700 delay-200">
              <CardHeader className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b py-3">
                <CardTitle className="py-2 flex items-center gap-2 text-base">
                  <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div
                  className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground [&_p]:text-foreground/90 [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:font-bold [&_strong]:text-foreground [&_b]:font-bold [&_b]:text-foreground [&_em]:italic [&_em]:text-foreground/90 [&_i]:italic [&_i]:text-foreground/90 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/80 [&_blockquote]:my-4 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-3 [&_ol]:space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-3 [&_ul]:space-y-2 [&_li]:text-foreground/90 [&_li]:leading-relaxed [&_li]:marker:text-foreground"
                  dangerouslySetInnerHTML={{ __html: data.vision }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-2 border-dashed border-muted/30 animate-in fade-in-50 duration-700 delay-200">
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-muted/20 rounded-lg flex items-center justify-center mx-auto">
                    <Shield className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground/70">
                      Vision Statement
                    </h3>
                    <p className="text-xs text-muted-foreground/50">
                      Our vision will be shared soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mission */}
          {data?.mission ? (
            <Card className="py-0 shadow-md border hover:shadow-lg transition-all group hover:-translate-y-0.5 animate-in fade-in-50 duration-700 delay-300">
              <CardHeader className="bg-gradient-to-br from-blue-500/8 via-blue-500/4 to-transparent border-b py-3">
                <CardTitle className="py-2 flex items-center gap-2 text-base">
                  <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </div>
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div
                  className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground [&_p]:text-foreground/90 [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:font-bold [&_strong]:text-foreground [&_b]:font-bold [&_b]:text-foreground [&_em]:italic [&_em]:text-foreground/90 [&_i]:italic [&_i]:text-foreground/90 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/80 [&_blockquote]:my-4 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-3 [&_ol]:space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-3 [&_ul]:space-y-2 [&_li]:text-foreground/90 [&_li]:leading-relaxed [&_li]:marker:text-foreground"
                  dangerouslySetInnerHTML={{ __html: data.mission }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-2 border-dashed border-muted/30 animate-in fade-in-50 duration-700 delay-300">
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-muted/20 rounded-lg flex items-center justify-center mx-auto">
                    <BarChart3 className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground/70">
                      Mission Statement
                    </h3>
                    <p className="text-xs text-muted-foreground/50">
                      Our mission will be shared soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    );
  };

  // If not superadmin, show only preview
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-8xl mx-auto p-2">
          <div className="space-y-0">
            <PreviewContent data={cmsData} />
          </div>
        </div>
      </div>
    );
  }

  // Superadmin view with tabs
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="max-w-8xl mx-auto p-2">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-card border shadow-sm">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Home Page
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Home Page
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-0">
            <PreviewContent data={cmsData} />
          </TabsContent>

          <TabsContent value="edit" className="space-y-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Welcome Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Welcome Section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome_title">Page Title *</Label>
                    <Input
                      id="welcome_title"
                      name="welcome_title"
                      value={formData.welcome_title}
                      onChange={handleChange}
                      placeholder="e.g., Document Management System"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcome_text">Welcome Description</Label>
                    <Input
                      id="welcome_text"
                      name="welcome_text"
                      value={formData.welcome_text}
                      onChange={handleChange}
                      placeholder="Brief description of your organization"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Branding & Media */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UploadIcon className="h-5 w-5" />
                    Branding & Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label>Company Logo</Label>
                    <div className="flex items-start gap-4">
                      {/* Logo Preview */}
                      <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                        {logoPreview ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={logoPreview}
                              alt="Logo preview"
                              fill
                              className="object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      {/* Upload Controls */}
                      <div className="flex-1 space-y-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <UploadIcon className="mr-2 h-4 w-4" />
                              Upload Logo
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Upload an image file (PNG, JPG, max 5MB)
                        </p>
                        {formData.logo_url && (
                          <Input
                            placeholder="Or paste image URL"
                            value={formData.logo_url}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                logo_url: e.target.value,
                              }));
                              setLogoPreview(e.target.value);
                            }}
                            className="text-xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Video Upload/URL */}
                  <div className="space-y-3">
                    <Label>Introduction Video</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
                        value={formData.video_url}
                        onChange={handleChange}
                        name="video_url"
                        type="text"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex-1 border-t" />
                        <span className="text-xs text-muted-foreground">
                          OR
                        </span>
                        <div className="flex-1 border-t" />
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("video-upload")?.click()
                        }
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadIcon className="mr-2 h-4 w-4" />
                            Upload Video File
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Upload a video file (MP4, WebM, max 50MB) or paste a
                        YouTube URL
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vision Statement */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Vision Statement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TiptapEditor
                    content={formData.vision}
                    onChange={(content) =>
                      handleEditorChange("vision", content)
                    }
                    placeholder="Enter your organization's vision statement..."
                  />
                </CardContent>
              </Card>

              {/* Mission Statement */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Mission Statement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TiptapEditor
                    content={formData.mission}
                    onChange={(content) =>
                      handleEditorChange("mission", content)
                    }
                    placeholder="Enter your organization's mission statement..."
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("preview")}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Changes
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Homepage;
