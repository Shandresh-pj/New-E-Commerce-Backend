import fs from 'fs';
import path from 'path';

export class TemplateRenderer {
    private static cache: Map<string, string> = new Map();

    /**
     * Loads an HTML email template and replaces variables
     * @param templateName The name of the HTML file (e.g. 'welcome-email') without .html extension
     * @param variables Object containing key-value pairs to replace in the template (e.g. { user_name: 'John' })
     * @returns The fully rendered HTML string
     */
    static renderTemplate(templateName: string, variables: Record<string, string | number>): string {
        let templateContent = this.cache.get(templateName);

        if (!templateContent) {
            // Find template file in the email-templates directory
            const templatePath = path.join(__dirname, '..', '..', 'email-templates', `${templateName}.html`);
            
            try {
                templateContent = fs.readFileSync(templatePath, 'utf8');
                this.cache.set(templateName, templateContent);
            } catch (error) {
                console.error(`Error reading email template: ${templateName}`, error);
                throw new Error(`Email template ${templateName} not found`);
            }
        }

        // Replace all {{key}} with value from variables object
        let renderedHtml = templateContent;
        for (const [key, value] of Object.entries(variables)) {
            // Use regex to replace all occurrences globally
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            renderedHtml = renderedHtml.replace(regex, String(value));
        }

        return renderedHtml;
    }
}
