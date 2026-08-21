import type { ExportTemplate } from "../exportTemplates";

export interface ExportTemplateRepository {
  listForOrganization(organizationId: string): Promise<ExportTemplate[]>;
  getById(id: string): Promise<ExportTemplate | null>;
  save(template: ExportTemplate): Promise<void>;
  delete(id: string): Promise<void>;
}
