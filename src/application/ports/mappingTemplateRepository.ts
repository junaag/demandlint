import type { MappingTemplate } from "../mapping/contracts";

export interface MappingTemplateRepository {
  listForOrganization(organizationId: string): Promise<MappingTemplate[]>;
  getById(id: string): Promise<MappingTemplate | null>;
  save(template: MappingTemplate): Promise<void>;
  delete(id: string): Promise<void>;
}
