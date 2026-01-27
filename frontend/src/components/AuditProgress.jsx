import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Progress } from './ui/Progress';
import { Loader2 } from 'lucide-react';

export function AuditProgress({ progress }) {
  if (!progress || progress.length === 0) {
    return null;
  }

  const latestEvent = progress[progress.length - 1];
  
  let progressValue = 0;
  if (latestEvent.type === 'crawling' && latestEvent.total) {
    progressValue = (latestEvent.visited / latestEvent.total) * 100;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Audit in Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestEvent.type === 'crawling' && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crawling pages...</span>
                <span className="font-medium">{latestEvent.visited} / {latestEvent.total}</span>
              </div>
              <Progress value={progressValue} />
            </div>
            <div className="text-sm text-muted-foreground">
              Current: {latestEvent.url}
            </div>
          </>
        )}
        
        {latestEvent.type !== 'crawling' && (
          <div className="text-sm">
            {latestEvent.message || latestEvent.type}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
