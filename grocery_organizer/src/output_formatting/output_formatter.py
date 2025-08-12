from grocery_organizer.src.core.models import FullProduct
from collections import defaultdict

# TODO need to consider output_format option in main
class OutputFormatter:
    def __init__(self, products: [FullProduct], output_format: str):
        self.products = products
        self.output_format = output_format

    def format_output(self):
        if self.output_format == "aisle":
            return self.aisle_format()
        else:
            return self.category_format()

    def aisle_format(self):
        aisle_groups = defaultdict(list)
        for product in self.products:
            if product.aisle_number > 0:
                aisle_groups[product.aisle_number].append(product)
            else:
                aisle_groups[product.category].append(product)

        formatted_sections = []

        # Sort by aisle, but put "Not Found" at the end
        def sort_key(element):
            key, products = element
            if isinstance(key, str):
                if key == "Not Found":
                    return (2, key)  # Put "Not Found" last
                else:
                    return (1, key)  # Other categories after aisles
            else:
                return (0, key)  # Aisles first

        for aisle, products in sorted(aisle_groups.items(), key=sort_key):
            if isinstance(aisle, str):
                section = '## ' + aisle + '\n'
            else:
                section = '## Aisle ' + str(aisle) + '\n'
            for product in products:
                section += '- ' + str(product) + '\n'
            formatted_sections.append(section.strip())

        return '\n\n'.join(formatted_sections)

    def category_format(self):
        # Group items by their section in the store
        grouped_items = defaultdict(list)
        for item in self.products:
            grouped_items[item.category].append(item)

        formatted_sections = []
        # Sort categories, but put "Not Found" at the end
        sorted_categories = sorted(grouped_items.keys(), key=lambda x: (x == "Not Found", x))
        
        for category in sorted_categories:
            products = grouped_items[category]
            section = '## ' + category + '\n'
            for product in products:
                section += '- ' + str(product) + '\n'
            formatted_sections.append(section.strip())

        return '\n\n'.join(formatted_sections)