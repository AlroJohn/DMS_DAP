"use client";

import { useState, useEffect } from "react";
import { useHomeCMS } from "@/hooks/use-home.cms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Settings, Save, Loader2, Upload as UploadIcon, Eye, Edit, FileText, Shield, BarChart3, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import TiptapEditor from "./tiptap-editor";
import Image from "next/image";

export default function HomeCMSEditor() {
  const { cmsData, loading, saving, saveCMS } = useHomeCMS();
  const [formData, setFormData] = useState({
    logo_url: "",
    video_url: "",
    vision: "",
    mission: "",
    welcome_title: "",
    welcome_text: "",
  });
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

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
    }
  }, [cmsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await saveCMS(formData);

    if (result.success) {
      toast.success("Home page content updated successfully!");
      setOpen(false);
    } else {
      toast.error(result.message || "Failed to update content");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="shadow-lg">
          <Settings className="mr-2 h-4 w-4" />
          Edit Home Page
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Home Page Content</DialogTitle>
          <DialogDescription>
            Edit your organization's information or preview how it will look on the home page
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Content
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Edit Tab */}
          <TabsContent value="edit" className="flex-1 overflow-y-auto mt-0">
            <form onSubmit={handleSubmit} className="space-y-6 pr-2">
              {/* Welcome Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Welcome Section</CardTitle>
                  <CardDescription>
                    Main heading and description for your home page
                  </CardDescription>
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

              {/* Branding */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UploadIcon className="h-5 w-5" />
                    Branding & Media
                  </CardTitle>
                  <CardDescription>
                    Upload logo and video URLs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Company Logo URL</Label>
                    <Input
                      id="logo_url"
                      name="logo_url"
                      value={formData.logo_url}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                      type="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the direct URL to your company logo image
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_url">Introduction Video URL</Label>
                    <Input
                      id="video_url"
                      name="video_url"
                      value={formData.video_url}
                      onChange={handleChange}
                      placeholder="https://www.youtube.com/embed/VIDEO_ID"
                      type="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use YouTube embed URL format: https://www.youtube.com/embed/VIDEO_ID
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Vision Statement with Rich Text Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vision Statement</CardTitle>
                  <CardDescription>
                    Define your organization's vision using the rich text editor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TiptapEditor
                    content={formData.vision}
                    onChange={(content) => handleEditorChange("vision", content)}
                    placeholder="Enter your organization's vision statement..."
                  />
                </CardContent>
              </Card>

              {/* Mission Statement with Rich Text Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mission Statement</CardTitle>
                  <CardDescription>
                    Define your organization's mission using the rich text editor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TiptapEditor
                    content={formData.mission}
                    onChange={(content) => handleEditorChange("mission", content)}
                    placeholder="Enter your organization's mission statement..."
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
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

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-0">
            <div className="bg-linear-to-br from-background via-background to-accent/5 p-8 rounded-lg">
              <div className="max-w-5xl mx-auto space-y-8">
                {/* Preview: Company Logo Section */}
                <div className="text-center space-y-6 py-12">
                  <div className="flex items-center justify-center mb-8">
                    {formData.logo_url ? (
                      <div className="w-32 h-32 relative">
                        <Image
                          src={formData.logo_url}
                          alt="Organization Logo Preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-linear-to-br from-primary via-primary/90 to-primary/80 rounded-2xl flex items-center justify-center shadow-2xl">
                        <FileText className="h-16 w-16 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <h1 className="text-5xl font-bold tracking-tight bg-linear-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                      {formData.welcome_title || "Document Management System"}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                      {formData.welcome_text || "Welcome to our organization's document management platform"}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 px-4 py-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        System Online
                      </Badge>
                      <Badge variant="outline" className="px-4 py-1">Version 1.0.0</Badge>
                    </div>
                  </div>
                </div>

                {/* Preview: Video Section */}
                {formData.video_url && (
                  <Card className="shadow-xl border-2 overflow-hidden">
                    <CardHeader className="bg-linear-to-r from-primary/5 to-secondary/5">
                      <CardTitle className="text-2xl">Introduction Video</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="aspect-video bg-black">
                        <iframe
                          src={formData.video_url}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preview: Vision & Mission Section */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Vision Preview */}
                  {formData.vision ? (
                    <Card className="shadow-xl border-2">
                      <CardHeader className="bg-linear-to-br from-primary/5 to-primary/10">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Shield className="h-6 w-6 text-primary" />
                          </div>
                          Our Vision
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div 
                          className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formData.vision }}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="shadow-xl border-2 border-dashed border-muted">
                      <CardContent className="p-12 text-center">
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <Shield className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">No Vision Statement</h3>
                            <p className="text-muted-foreground">Add your organization's vision in the Edit tab</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Mission Preview */}
                  {formData.mission ? (
                    <Card className="shadow-xl border-2">
                      <CardHeader className="bg-linear-to-br from-secondary/5 to-secondary/10">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-secondary" />
                          </div>
                          Our Mission
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div 
                          className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formData.mission }}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="shadow-xl border-2 border-dashed border-muted">
                      <CardContent className="p-12 text-center">
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">No Mission Statement</h3>
                            <p className="text-muted-foreground">Add your organization's mission in the Edit tab</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Preview Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t sticky bottom-0 bg-background/95 backdrop-blur py-4">
                  <p className="text-sm text-muted-foreground">This is how your home page will look</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("edit")}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Back to Edit
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={saving}>
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
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
