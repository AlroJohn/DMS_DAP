"use client";

import { useState } from "react";
import { Save, Play, CheckCircle, ArrowRight, Settings, Workflow, Plus, Users, Clock, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function WorkflowBuilderPage() {
  const [workflowName, setWorkflowName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [priority, setPriority] = useState("");

  const components = [
    { id: 'start', name: 'Start', color: 'bg-blue-500', icon: Play, description: 'Workflow entry point' },
    { id: 'approval', name: 'Approval', color: 'bg-yellow-500', icon: Users, description: 'Requires user approval' },
    { id: 'signature', name: 'Blockchain Signature', color: 'bg-purple-500', icon: Shield, description: 'DocOnChain signing' },
    { id: 'notification', name: 'Notification', color: 'bg-orange-500', icon: Mail, description: 'Send notifications' },
    { id: 'delay', name: 'Delay', color: 'bg-gray-500', icon: Clock, description: 'Wait period' },
    { id: 'end', name: 'End', color: 'bg-green-500', icon: CheckCircle, description: 'Workflow completion' }
  ];

  const [workflowSteps, setWorkflowSteps] = useState([
    { id: 1, name: 'Document Submission', type: 'start', color: 'bg-blue-500', config: {} },
    { id: 2, name: 'Department Manager Approval', type: 'approval', color: 'bg-yellow-500', config: { approvers: ['manager'], deadline: 48 } },
    { id: 3, name: 'Blockchain Signature Required', type: 'signature', color: 'bg-purple-500', config: { required: true } },
    { id: 4, name: 'Workflow Complete', type: 'end', color: 'bg-green-500', config: {} }
  ]);
  
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [showStepConfig, setShowStepConfig] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Builder</h1>
          <p className="text-muted-foreground">Create and configure document approval workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Test Workflow
          </Button>
          <Button>
            <CheckCircle className="h-4 w-4 mr-2" />
            Activate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Workflow Components
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {components.map((component) => {
                const Icon = component.icon;
                return (
                  <div
                    key={component.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    draggable
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${component.color} rounded flex items-center justify-center text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{component.name}</span>
                        <p className="text-xs text-muted-foreground">{component.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Workflow Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  placeholder="Enter workflow name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-types">Document Types</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="memo">Memo</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  placeholder="Describe the workflow purpose..."
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="auto-start" />
                <Label htmlFor="auto-start">Auto-start on document creation</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="blockchain-required" />
                <Label htmlFor="blockchain-required">Require blockchain signatures</Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="email-notifications" defaultChecked />
                <Label htmlFor="email-notifications">Email notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="in-app-notifications" defaultChecked />
                <Label htmlFor="in-app-notifications">In-app notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="deadline-reminders" />
                <Label htmlFor="deadline-reminders">Deadline reminders</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Visual Workflow Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg min-h-96 p-6 bg-gradient-to-br from-accent/20 to-muted/10">
                <div className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id} className="relative">
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-14 h-14 ${step.color} rounded-xl flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg`}
                          onClick={() => {
                            setSelectedStep(step.id);
                            setShowStepConfig(true);
                          }}
                        >
                          {(() => {
                            const component = components.find(c => c.id === step.type);
                            if (component?.icon) {
                              const Icon = component.icon;
                              return <Icon className="h-7 w-7" />;
                            }
                            return null;
                          })()}
                        </div>
                        
                        <div className="flex-1 p-4 border rounded-xl bg-card hover:bg-accent/50 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                             onClick={() => {
                               setSelectedStep(step.id);
                               setShowStepConfig(true);
                             }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-card-foreground">{step.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {components.find(c => c.id === step.type)?.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="capitalize">
                                {step.type.replace('_', ' ')}
                              </Badge>
                              {step.type === 'signature' && (
                                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Blockchain
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {index < workflowSteps.length - 1 && (
                        <div className="flex justify-center my-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-muted-foreground/30"></div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground/60" />
                            <div className="w-8 h-0.5 bg-muted-foreground/30"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-8">
                    <Button 
                      variant="outline" 
                      className="w-full h-14 border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                      onClick={() => {
                        const newStep = {
                          id: workflowSteps.length + 1,
                          name: 'New Step',
                          type: 'approval',
                          color: 'bg-yellow-500',
                          config: {}
                        };
                        setWorkflowSteps([...workflowSteps, newStep]);
                      }}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Workflow Step
                    </Button>
                  </div>
                </div>
              </div>

              {showStepConfig && selectedStep && (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle>Step Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Step Name</Label>
                      <Input 
                        value={workflowSteps.find(s => s.id === selectedStep)?.name || ''}
                        onChange={(e) => {
                          setWorkflowSteps(prev => prev.map(s => 
                            s.id === selectedStep ? { ...s, name: e.target.value } : s
                          ));
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Step Type</Label>
                      <Select 
                        value={workflowSteps.find(s => s.id === selectedStep)?.type || ''}
                        onValueChange={(value) => {
                          setWorkflowSteps(prev => prev.map(s => 
                            s.id === selectedStep ? { ...s, type: value } : s
                          ));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {components.map(comp => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {workflowSteps.find(s => s.id === selectedStep)?.type === 'approval' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Deadline (hours)</Label>
                          <Input type="number" placeholder="48" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="escalation" />
                          <Label htmlFor="escalation">Enable escalation</Label>
                        </div>
                      </div>
                    )}
                    
                    {workflowSteps.find(s => s.id === selectedStep)?.type === 'signature' && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="blockchain-required" defaultChecked />
                          <Label htmlFor="blockchain-required">Blockchain signature required</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="multi-signature" />
                          <Label htmlFor="multi-signature">Multiple signatures required</Label>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowStepConfig(false)}>Cancel</Button>
                      <Button onClick={() => setShowStepConfig(false)}>Save Configuration</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}