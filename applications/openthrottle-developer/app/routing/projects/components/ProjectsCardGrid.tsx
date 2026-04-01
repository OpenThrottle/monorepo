import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import classnames from 'classnames';
import type { ProjectCardFragment } from '~/__generated__/graphql';

export interface ProjectsCardGridProps {
  className?: string;
  projects: ProjectCardFragment[];
}

/**
 * @description Grid of project cards: name, description, nxProjectName badge, View link. Uses same project data as table.
 */
export const ProjectsCardGrid = (props: ProjectsCardGridProps) => {
  const { className, projects } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8',
        className,
      )}
      data-testid="ProjectsCardGrid"
    >
      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle className="text-lg line-clamp-1">
              {project.name}
            </CardTitle>
            {project.description ? (
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            ) : null}
          </CardHeader>

          <CardContent>
            {project.nxProjectName ? (
              <Badge className="text-xs">{project.nxProjectName}</Badge>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </CardContent>

          <CardFooter>
            <Button asChild={true} className="text-xs" variant="ghost">
              <Link to={`/projects/${project.id}`}>View</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
