import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Copy, RefreshCw, Code, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JsonToDartConverterProps {}

const JsonToDartConverter: React.FC<JsonToDartConverterProps> = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [className, setClassName] = useState('MyModel');
  const [dartOutput, setDartOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const convertJsonToDart = () => {
    if (!jsonInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid JSON string",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    
    try {
      const parsedJson = JSON.parse(jsonInput);
      const dartClass = generateDartClass(parsedJson, className);
      setDartOutput(dartClass);
      
      toast({
        title: "Success",
        description: "JSON converted to Dart model successfully!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format. Please check your input.",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const generateDartClass = (json: any, className: string): string => {
    const generateFieldType = (value: any, key: string): string => {
      if (value === null) return 'dynamic';
      if (typeof value === 'string') return 'String';
      if (typeof value === 'number') {
        return Number.isInteger(value) ? 'int' : 'double';
      }
      if (typeof value === 'boolean') return 'bool';
      if (Array.isArray(value)) {
        if (value.length === 0) return 'List<dynamic>';
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          const itemClassName = capitalizeFirst(key.replace(/s$/, ''));
          return `List<${itemClassName}>`;
        }
        return `List<${generateFieldType(firstItem, key)}>`;
      }
      if (typeof value === 'object') {
        return capitalizeFirst(key);
      }
      return 'dynamic';
    };

    const capitalizeFirst = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const generateNestedClasses = (obj: any, className: string): string => {
      let nestedClasses = '';
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const nestedClassName = capitalizeFirst(key);
          nestedClasses += generateNestedClasses(value, nestedClassName);
          nestedClasses += `\nclass ${nestedClassName} {\n`;
          nestedClasses += generateClassContent(value, nestedClassName);
          nestedClasses += '}\n';
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          const itemClassName = capitalizeFirst(key.replace(/s$/, ''));
          nestedClasses += generateNestedClasses(value[0], itemClassName);
          nestedClasses += `\nclass ${itemClassName} {\n`;
          nestedClasses += generateClassContent(value[0], itemClassName);
          nestedClasses += '}\n';
        }
      }
      
      return nestedClasses;
    };

    const generateClassContent = (obj: any, className: string): string => {
      let content = '';
      
      // Fields
      for (const [key, value] of Object.entries(obj)) {
        const fieldType = generateFieldType(value, key);
        content += `  final ${fieldType}? ${key};\n`;
      }
      
      content += '\n';
      
      // Constructor
      const fields = Object.keys(obj);
      content += `  ${className}({\n`;
      fields.forEach(field => {
        content += `    this.${field},\n`;
      });
      content += '  });\n\n';
      
      // fromJson method
      content += `  factory ${className}.fromJson(Map<String, dynamic> json) {\n`;
      content += `    return ${className}(\n`;
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const nestedClassName = capitalizeFirst(key);
          content += `      ${key}: json['${key}'] != null ? ${nestedClassName}.fromJson(json['${key}']) : null,\n`;
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          const itemClassName = capitalizeFirst(key.replace(/s$/, ''));
          content += `      ${key}: json['${key}'] != null ? (json['${key}'] as List).map((item) => ${itemClassName}.fromJson(item)).toList() : null,\n`;
        } else {
          content += `      ${key}: json['${key}'],\n`;
        }
      }
      content += '    );\n';
      content += '  }\n\n';
      
      // toJson method
      content += `  Map<String, dynamic> toJson() {\n`;
      content += '    return {\n';
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          content += `      '${key}': ${key}?.toJson(),\n`;
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          content += `      '${key}': ${key}?.map((item) => item.toJson()).toList(),\n`;
        } else {
          content += `      '${key}': ${key},\n`;
        }
      }
      content += '    };\n';
      content += '  }\n';
      
      return content;
    };

    const nestedClasses = generateNestedClasses(json, className);
    let dartClass = nestedClasses;
    
    dartClass += `\nclass ${className} {\n`;
    dartClass += generateClassContent(json, className);
    dartClass += '}\n';
    
    return dartClass;
  };

  const copyToClipboard = async () => {
    if (!dartOutput) {
      toast({
        title: "Error",
        description: "No Dart code to copy",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(dartOutput);
      toast({
        title: "Copied!",
        description: "Dart code copied to clipboard",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const clearAll = () => {
    setJsonInput('');
    setDartOutput('');
    setClassName('MyModel');
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            JSON to Dart Converter
          </h1>
          <p className="text-muted-foreground text-lg">
            Transform your JSON data into beautiful Dart model classes
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center">
          <div className="flex-1 max-w-md">
            <Label htmlFor="className" className="text-sm font-medium mb-2 block">
              Class Name
            </Label>
            <Input
              id="className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Enter class name"
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={convertJsonToDart}
              disabled={isConverting}
              size="lg"
              className="flex items-center gap-2"
            >
              {isConverting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Convert
            </Button>
            <Button
              onClick={clearAll}
              variant="outline"
              size="lg"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* JSON Input */}
          <Card className="shadow-elegant border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                JSON Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON here..."
                className="min-h-[400px] font-mono text-sm bg-background/50 border-border/50 resize-none"
              />
            </CardContent>
          </Card>

          {/* Dart Output */}
          <Card className="shadow-elegant border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Dart Model
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant="success"
                  size="sm"
                  disabled={!dartOutput}
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={dartOutput}
                readOnly
                placeholder="Generated Dart code will appear here..."
                className="min-h-[400px] font-mono text-sm bg-code-bg text-code-foreground border-border/50 resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground">
          <p className="text-sm">
            Built with ❤️ for Flutter developers
          </p>
        </div>
      </div>
    </div>
  );
};

export default JsonToDartConverter;