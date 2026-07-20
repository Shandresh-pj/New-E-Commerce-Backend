import fs from 'fs';
import path from 'path';

export class TemplateRenderer {
    private static cache: Map<string, string> = new Map();

    /**
     * Loads an HTML email template and replaces {{variable}} placeholders.
     * @param templateName - File name without .html extension (e.g. 'welcome-email')
     * @param variables    - Key-value map to substitute in the template
     * @returns Fully rendered HTML string
     */
    static renderTemplate(
        templateName: string,
        variables: Record<string, string | number>
    ): string {
        let templateContent = this.cache.get(templateName);

        if (!templateContent) {
            const templatePath = path.join(
                __dirname, '..', '..', 'email-templates',
                `${templateName}.html`
            );

            try {
                templateContent = fs.readFileSync(templatePath, 'utf8');
                this.cache.set(templateName, templateContent);
            } catch (error) {
                console.error(`[TemplateRenderer] Template not found: ${templateName}`, error);
                throw new Error(`Email template "${templateName}" not found at ${templatePath}`);
            }
        }

        // Replace all {{key}} or {{ key }} occurrences globally
        let rendered = templateContent;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            rendered = rendered.replace(regex, String(value ?? ''));
        }

        // Warn about any remaining unresolved placeholders in dev/staging
        if (process.env.NODE_ENV !== 'production') {
            const unresolved = rendered.match(/\{\{[^}]+\}\}/g);
            if (unresolved) {
                console.warn(
                    `[TemplateRenderer] Unresolved placeholders in "${templateName}":`,
                    unresolved
                );
            }
        }

        return rendered;
    }

    /**
     * Clear the template cache — useful in development or after template updates
     */
    static clearCache(templateName?: string): void {
        if (templateName) {
            this.cache.delete(templateName);
        } else {
            this.cache.clear();
        }
    }
}
